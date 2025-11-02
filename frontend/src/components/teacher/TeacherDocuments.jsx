import { useEffect, useMemo, useState } from "react";
import DocumentApi from "../../services/api/DocumentApi";
import DegreeApi from "../../services/api/admin/DegreeApi";

// shadcn/ui
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ───────────────────────────── Helpers ───────────────────────────── */
const NONE_VALUE = "__none__"; // sentinel “Aucun degré”

const unwrapArray = (res) =>
  Array.isArray(res?.data?.data) ? res.data.data :
  Array.isArray(res?.data)       ? res.data      :
  [];

/** Load degrees from a public endpoint, fallback to admin if needed. */
async function loadPublicDegrees() {
  try {
    // Prefer a public “degrees” endpoint if you have it wired on DocumentApi
    const r = await DocumentApi.degrees?.();
    const arr = unwrapArray(r);
    if (arr.length) return arr;
  } catch {}

  // Fallback: admin endpoint (works if teacher has permission)
  try {
    const r2 = await DegreeApi.publicList?.({ per_page: 1000 });
    return unwrapArray(r2);
  } catch {
    return [];
  }
}

/** Map degree id → name; robustly resolve from doc fields or loaded list */
function useDegreeName(degrees) {
  return useMemo(() => {
    const byId = new Map();
    (degrees || []).forEach((d) => {
      const label = d?.name ?? d?.title ?? d?.label ?? `Degré #${d?.id}`;
      byId.set(String(d?.id), label);
    });
    return (doc) => {
      if (doc?.degree?.name) return doc.degree.name;
      if (doc?.degree_name)  return doc.degree_name;
      if (doc?.degree_id && byId.get(String(doc.degree_id))) return byId.get(String(doc.degree_id));
      return doc?.degree_id ? `Degré #${doc.degree_id}` : "—";
    };
  }, [degrees]);
}

/* ───────────────────────────── Component ───────────────────────────── */
export default function TeacherDocuments() {
  // Reference data
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  // List & loading
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degreeId, setDegreeId] = useState(NONE_VALUE);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Deletion
  const [deletingId, setDeletingId] = useState(null);

  // Management toolbar state
  const [q, setQ] = useState("");
  const [filterDegree, setFilterDegree] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | title | size

  const degreeNameOf = useDegreeName(degrees);

  const degreeOptions = useMemo(() => {
    const opts = (degrees ?? []).map((d) => ({
      value: String(d.id),
      label: d.name ?? d.title ?? d.label ?? `Degré #${d.id}`,
    }));
    return [{ value: NONE_VALUE, label: "— Aucun degré —" }, ...opts];
  }, [degrees]);

  const degreeFilterOptions = useMemo(() => {
    const base = [{ value: "all", label: "Tous les degrés" }];
    const opts = (degrees ?? []).map((d) => ({
      value: String(d.id),
      label: d.name ?? d.title ?? d.label ?? `Degré #${d.id}`,
    }));
    return [...base, ...opts];
  }, [degrees]);

  const subjectFilterOptions = useMemo(() => {
    const set = new Set(list.map((d) => d.subject_name).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [list]);

  async function loadAll() {
    setLoading(true);
    setDegreesLoading(true);
    try {
      const [degArr, docsRes] = await Promise.all([
        loadPublicDegrees(),
        DocumentApi.listTeacher(),
      ]);

      setDegrees(degArr);

      const docs =
        docsRes?.data?.data?.data ??
        docsRes?.data?.data ??
        docsRes?.data ??
        [];
      setList(Array.isArray(docs) ? docs : []);
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* ------------- Filters & sort for “Mes documents” ------------- */
  const filtered = useMemo(() => {
    let rows = Array.isArray(list) ? [...list] : [];

    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((d) =>
        `${d.title || ""} ${d.description || ""} ${d.subject_name || ""}`
          .toLowerCase()
          .includes(needle)
      );
    }

    if (filterDegree !== "all") {
      rows = rows.filter(
        (d) => String(d.degree_id ?? d.degree?.id) === filterDegree
      );
    }

    if (filterSubject !== "all") {
      rows = rows.filter((d) => d.subject_name === filterSubject);
    }

    switch (sortBy) {
      case "title":
        rows.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "size":
        rows.sort((a, b) => (a.filesize || 0) - (b.filesize || 0));
        break;
      default: // newest
        rows.sort(
          (a, b) =>
            new Date(b.created_at || b.updated_at || 0) -
            new Date(a.created_at || a.updated_at || 0)
        );
    }

    return rows;
  }, [list, q, filterDegree, filterSubject, sortBy]);

  /* ----------------------------- Handlers ----------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      alert("Choisissez un fichier.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        degree_id: degreeId === NONE_VALUE ? "" : Number(degreeId),
        file,
      };
      await DocumentApi.upload(payload);

      // reset form
      setTitle("");
      setDescription("");
      setDegreeId(NONE_VALUE);
      setFile(null);

      await loadAll();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Échec de l’envoi du document.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeletingId(id);
    try {
      await DocumentApi.deleteAsTeacher(id);
      await loadAll();
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403) {
        alert("Suppression refusée (403) : vous n’êtes pas autorisé à supprimer ce document.");
      } else if (st === 404) {
        alert("Document introuvable (404).");
      } else {
        alert(e?.response?.data?.message || e?.message || "Échec de la suppression.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="space-y-6">
      {/* Upload form */}
      <Card className="rounded-2xl border-0 shadow-none">
        <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4">
          <h2 className="text-lg font-semibold">Partager un document</h2>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="doc-title">Titre</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ex. : Chapitre 2 – Les équations"
              />
            </div>

            <div>
              <Label>Niveau (degré)</Label>
              <Select value={degreeId} onValueChange={setDegreeId}>
                <SelectTrigger>
                  <SelectValue placeholder={degreesLoading ? "Chargement…" : "Sélectionner…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>— Aucun degré —</SelectItem>

                  {degreesLoading && (
                    <SelectItem value="__loading" disabled>
                      Chargement…
                    </SelectItem>
                  )}

                  {!degreesLoading && degrees.length === 0 && (
                    <SelectItem value="__empty" disabled>
                      Aucun degré disponible
                    </SelectItem>
                  )}

                  {degrees.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name ?? d.title ?? d.label ?? `Degré #${d.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Laissez “Aucun degré” si le document est général.
              </p>
            </div>

            <div>
              <Label>Fichier</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                PDF/images recommandés. Taille max conseillée : 10 Mo.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Infos complémentaires, consignes, contexte…"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Management + list */}
      <Card className="rounded-2xl border-0 shadow-none">
        <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Mes documents</h2>

          {/* Toolbar: responsive */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher (titre, description, matière)…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Select value={filterDegree} onValueChange={setFilterDegree}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Degré" />
              </SelectTrigger>
              <SelectContent>
                {degreeFilterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Matière" />
              </SelectTrigger>
              <SelectContent>
                {subjectFilterOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Toutes les matières" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Trier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="title">Titre (A→Z)</SelectItem>
                <SelectItem value="size">Taille (croissante)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun document.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => {
                const degreeName = degreeNameOf(d);
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row"
                  >
                    <div className="w-full">
                      <div className="font-medium line-clamp-2">{d.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {d.subject_name ? `${d.subject_name} · ` : ""}
                        Degré: {degreeName}
                        {d.filesize_human ? ` · ${d.filesize_human}` : ""}
                      </div>

                      {d.file_url ? (
                        <a
                          className="text-sm underline break-all"
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          title={d.file_url}
                        >
                          Télécharger
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">(lien indisponible)</span>
                      )}
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => removeItem(d.id)}
                      disabled={deletingId === d.id}
                      className="w-full sm:w-auto"
                    >
                      {deletingId === d.id ? "Suppression…" : "Supprimer"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
