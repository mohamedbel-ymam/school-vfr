// src/components/teacher/TeacherDocuments.jsx
import { useEffect, useState } from "react";
import DocumentApi from "../../services/api/DocumentApi";
import { axiosClient } from "../../api/axios"; // ✅ needed for fallback fetches
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ---------------------------------- Helpers ---------------------------------- */
const DEGREE_CANDIDATES = [
  "/enseignant/degrees",
  "/teacher/degrees",
  "/me/degrees",
  "/degrees",          // public list, if you expose one
  "/admin/degrees"     // LAST resort only
];

function normalizeDegreePayload(res) {
  const arr = res?.data?.data ?? res?.data ?? [];
  return Array.isArray(arr)
    ? arr
        .map(d => ({
          id: d?.id ?? d?.value ?? null,
          name: d?.name ?? d?.title ?? d?.label ?? (d?.id ? `#${d.id}` : null),
        }))
        .filter(d => d.id && d.name)
    : [];
}

function mondayIsoToday() {
  const d = new Date();
  const js = d.getDay(); // 0..6
  const delta = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + delta);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fetch a teacher-safe degree list. Falls back to deriving from the teacher's timetable. */
async function fetchTeacherDegrees() {
  // Try known teacher/public endpoints first
  for (const url of DEGREE_CANDIDATES) {
    try {
      const r = await axiosClient.get(url, { params: { per_page: 1000 } });
      if (r?.status === 200) {
        const out = normalizeDegreePayload(r);
        if (out.length) return out;
      }
    } catch (e) {
      const s = e?.response?.status;
      // ignore auth/perm/not-found and try next candidate
      if (![401, 403, 404].includes(s)) {
        // network/unknown error → bubble up
        throw e;
      }
    }
  }

  // Last-chance fallback: derive from current week's teacher timetable
  try {
    const weekStart = mondayIsoToday();
    const r = await axiosClient.get("/enseignant/emploi-du-temps", { params: { week_start: weekStart } });
    const rows = r?.data?.data?.lessons ?? r?.data?.lessons ?? r?.data ?? [];
    const map = new Map();
    for (const l of rows) {
      const id =
        l?.degree_id ??
        l?.degree?.id ??
        l?.timetable?.degree_id ??
        l?.timetable?.degree?.id ??
        null;
      const name =
        l?.degree?.name ??
        l?.degree_name ??
        l?.timetable?.degree?.name ??
        null;
      if (id && name) map.set(String(id), String(name));
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}

/* --------------------------------- Component --------------------------------- */
export default function TeacherDocuments() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degreeId, setDegreeId] = useState("");
  const [file, setFile] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      setDegreesLoading(true);

      const [degList, docs] = await Promise.all([
        fetchTeacherDegrees(),
        DocumentApi.listTeacher(),
      ]);

      setDegrees(degList);

      const listDocs = docs?.data?.data?.data ?? docs?.data?.data ?? [];
      setList(listDocs);
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Choisissez un fichier");
    await DocumentApi.upload({
      title,
      description,
      degree_id: degreeId ? Number(degreeId) : null, // nullable degree OK
      file,
    });
    setTitle(""); setDescription(""); setDegreeId(""); setFile(null);
    await loadAll();
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    await DocumentApi.deleteAsTeacher(id);
    await loadAll();
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
                  <SelectValue placeholder={degreesLoading ? "Chargement…" : "Sélectionner..."} />
                </SelectTrigger>
                <SelectContent>
                  {degreesLoading && <SelectItem value="loading" disabled>Chargement…</SelectItem>}
                  {!degreesLoading && degrees.length === 0 && (
                    <SelectItem value="empty" disabled>Aucun degré</SelectItem>
                  )}
                  {!degreesLoading && degrees.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button type="submit">Envoyer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Mes documents</h2>
          {loading ? "Chargement…" : (
            <div className="space-y-3">
              {list.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucun document.</div>
              )}
              {list.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row"
                >
                  <div className="w-full">
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.subject_name ? `${d.subject_name} · ` : ""}Degré: {d.degree?.name ?? d.degree_id} · {d.filesize_human}
                    </div>
                    <a className="text-sm underline break-all" href={d.file_url} target="_blank" rel="noreferrer">
                      Télécharger
                    </a>
                  </div>
                  <Button variant="destructive" onClick={() => removeItem(d.id)}>Supprimer</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
