import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "../../api/axios";
import DocumentApi from "../../services/api/DocumentApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ───────────────────────────── Helpers ───────────────────────────── */
const NONE_VALUE = "__none__";

const safeStr = (v) => (v == null ? "" : String(v));
const isNumId = (v) => /^\d+$/.test(safeStr(v).trim());
const pad2 = (n) => String(n).padStart(2, "0");

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay();
  const delta = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/* Robust degree extraction from a lesson row */
const firstTruthy = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim?.() !== "");
const asDegreeObj = (x, fallbackId) => {
  if (!x) return null;
  if (typeof x === "string") return { id: fallbackId ?? x, name: x };
  return {
    id: firstTruthy(x.id, fallbackId, x.value),
    name: firstTruthy(x.name, x.title, x.label, x.fullname, x.full_name),
  };
};
const getDegreeFromLesson = (l) => {
  const nested =
    asDegreeObj(l?.degree, l?.degree_id) ||
    asDegreeObj(l?.timetable?.degree, l?.timetable?.degree_id) ||
    asDegreeObj(l?.classe?.degree) ||
    asDegreeObj(l?.class?.degree) ||
    asDegreeObj(l?.classroom?.degree) ||
    asDegreeObj(l?.group?.degree) ||
    asDegreeObj(l?.section?.degree) ||
    asDegreeObj(l?.division?.degree);

  if (nested) return nested;

  const flat = asDegreeObj(
    {
      name: firstTruthy(
        l?.degree_name,
        l?.degreeLabel,
        l?.degree_title,
        l?.niveau_name,
        l?.niveau,
        l?.level_name,
        l?.level,
        l?.class_name,
        l?.classe_name
      ),
    },
    firstTruthy(l?.degree_id, l?.niveau_id, l?.level_id, l?.class_id, l?.classe_id)
  );

  if (flat) return flat;

  if (l?.degree_id != null) return { id: l.degree_id, name: `Degré #${l.degree_id}` };
  return null;
};

const uniqById = (arr) => {
  const m = new Map();
  for (const it of arr) {
    const id = String(it.id);
    if (!m.has(id)) m.set(id, { id, name: it.name || `Degré #${id}` });
  }
  return [...m.values()];
};

/* Timetable fetcher (teacher) — we use it only to discover degrees */
async function fetchTeacherWeekLessons(weekStartIso) {
  try {
    const res = await axiosClient.get("/enseignant/emploi-du-temps", { params: { week_start: weekStartIso } });
    const data =
      res?.data?.data?.lessons ??
      res?.data?.lessons ??
      (Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* Build degree list from timetable (prev, current, next week) + from existing docs */
async function buildTeacherDegreeListFromContext() {
  const monday = startOfWeekMonday(new Date());
  const weeks = [-1, 0, 1].map((off) => {
    const d = addDays(monday, off * 7);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });

  const [prevL, currL, nextL] = await Promise.all([
    fetchTeacherWeekLessons(weeks[0]),
    fetchTeacherWeekLessons(weeks[1]),
    fetchTeacherWeekLessons(weeks[2]),
  ]);

  const lessons = [...prevL, ...currL, ...nextL];
  const fromLessons = lessons
    .map(getDegreeFromLesson)
    .filter((x) => x && isNumId(x.id))
    .map((x) => ({ id: String(x.id), name: safeStr(x.name) || `Degré #${x.id}` }));

  // Also use existing teacher docs (names/ids often present there)
  let fromDocs = [];
  try {
    const docs = await DocumentApi.listTeacher();
    const listDocs = docs?.data?.data?.data ?? docs?.data?.data ?? docs?.data ?? [];
    fromDocs = (Array.isArray(listDocs) ? listDocs : [])
      .map((d) => {
        const id = d?.degree?.id ?? d?.degree_id ?? null;
        const name = d?.degree?.name ?? null;
        return id != null && isNumId(id) ? { id: String(id), name: name || `Degré #${id}` } : null;
      })
      .filter(Boolean);
  } catch {
    /* ignore */
  }

  const merged = uniqById([...fromLessons, ...fromDocs]).sort((a, b) => safeStr(a.name).localeCompare(safeStr(b.name)));
  return merged;
}

/* Robust delete — use teacher route; if forbidden, show message */
async function deleteTeacherDoc(id) {
  try {
    return await DocumentApi.deleteAsTeacher(id); // expected to call /enseignant/documents/{id}
  } catch (e) {
    throw e;
  }
}

/* ───────────────────────────── Component ───────────────────────────── */
export default function TeacherDocuments() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degreeId, setDegreeId] = useState(NONE_VALUE);
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function loadAll() {
    setLoading(true);
    setDegreesLoading(true);
    try {
      // 1) Build degrees from timetable + docs (no admin endpoints)
      const degs = await buildTeacherDegreeListFromContext();
      setDegrees(degs);

      // 2) Load my docs
      const docs = await DocumentApi.listTeacher();
      const listDocs = docs?.data?.data?.data ?? docs?.data?.data ?? docs?.data ?? [];
      setList(Array.isArray(listDocs) ? listDocs : []);
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const degreeOptions = useMemo(() => {
    const base = [{ value: NONE_VALUE, label: "— Aucun degré —" }];
    const opts = (degrees ?? []).map((d) => ({ value: String(d.id), label: d.name || `Degré #${d.id}` }));
    return [...base, ...opts];
  }, [degrees]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Choisissez un fichier.");
    setSubmitting(true);
    try {
      await DocumentApi.upload({
        title: title.trim(),
        description: description.trim() || null,
        degree_id: degreeId === NONE_VALUE ? null : Number(degreeId),
        file,
      });
      setTitle("");
      setDescription("");
      setDegreeId(NONE_VALUE);
      setFile(null);
      await loadAll();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Échec de l’envoi du document.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    try {
      await deleteTeacherDoc(id);
      await loadAll();
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403) {
        alert("Suppression refusée (403). Le serveur n’autorise pas l’enseignant à supprimer ce document (vérifier la policy).");
      } else if (st === 404) {
        alert("Document introuvable (404).");
      } else {
        alert(e?.message || "Échec de la suppression.");
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Partager un document</h2>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <Label>Niveau (degré)</Label>
              <Select value={degreeId} onValueChange={setDegreeId}>
                <SelectTrigger>
                  <SelectValue placeholder={degreesLoading ? "Chargement…" : "Sélectionner…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>— Aucun degré —</SelectItem>
                  {degreesLoading && <SelectItem value="__loading" disabled>Chargement…</SelectItem>}
                  {!degreesLoading && degrees.length === 0 && (
                    <SelectItem value="__empty" disabled>Aucun degré disponible</SelectItem>
                  )}
                  {degrees.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name || `Degré #${d.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Laissez “Aucun degré” si le document est général.</p>
            </div>

            <div>
              <Label>Fichier</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>

            <div className="md:col-span-2">
              <Label>Description (optionnel)</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Mes documents</h2>
          {loading ? (
            "Chargement…"
          ) : (
            <div className="space-y-3">
              {list.length === 0 && <div className="text-sm text-muted-foreground">Aucun document.</div>}
              {list.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row">
                  <div className="w-full">
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.subject_name ? `${d.subject_name} · ` : ""}
                      Degré: {d.degree?.name ?? d.degree_id ?? "—"} · {d.filesize_human ?? ""}
                    </div>
                    {d.file_url ? (
                      <a className="text-sm underline break-all" href={d.file_url} target="_blank" rel="noreferrer">
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">(lien indisponible)</span>
                    )}
                  </div>
                  <Button variant="destructive" onClick={() => removeItem(d.id)} disabled={deleting === d.id}>
                    {deleting === d.id ? "Suppression…" : "Supprimer"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
