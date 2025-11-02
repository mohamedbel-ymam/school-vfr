// src/components/teacher/TeacherDevoirs.jsx
import { useEffect, useMemo, useState } from "react";
import HomeworkApi from "../../services/api/HomeworkApi";
import DegreeApi from "../../services/api/admin/DegreeApi";

// UI (shadcn)
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ───────────────────────────── Helpers ───────────────────────────── */
const unwrapDeg = (res) =>
  Array.isArray(res?.data?.data) ? res.data.data :
  Array.isArray(res?.data)       ? res.data      :
  [];

function useDegreeName(degrees) {
  return useMemo(() => {
    const map = new Map();
    (degrees || []).forEach(d => map.set(String(d.id), d.name ?? d.title ?? d.label ?? `Degré #${d.id}`));
    return (row) => {
      if (row?.degree?.name) return row.degree.name;
      if (row?.degree_name)  return row.degree_name;
      if (row?.degree_id && map.get(String(row.degree_id))) return map.get(String(row.degree_id));
      return row?.degree_id ? `Degré #${row.degree_id}` : "—";
    };
  }, [degrees]);
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const isOverdue = (iso) => iso && new Date(iso).getTime() < Date.now();

/* ───────────────────────────── Component ───────────────────────────── */
export default function TeacherDevoirs() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degreeId, setDegreeId] = useState("");
  const [dueAt, setDueAt] = useState(""); // datetime-local
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // management toolbar
  const [q, setQ] = useState("");
  const [filterDegree, setFilterDegree] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all | upcoming | overdue | no_due
  const [sortBy, setSortBy] = useState("soonest"); // soonest | newest | title

  const degreeNameOf = useDegreeName(degrees);

  async function loadAll() {
    setLoading(true);
    setDegreesLoading(true);
    try {
      const [degRes, items] = await Promise.all([
        DegreeApi.publicList({ per_page: 1000 }),
        HomeworkApi.listTeacher(),
      ]);
      setDegrees(unwrapDeg(degRes));
      const itemsList = items?.data?.data?.data ?? items?.data?.data ?? [];
      setList(Array.isArray(itemsList) ? itemsList : []);
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!degreeId) return alert("Choisissez un niveau");
    if (!file) return alert("Choisissez un fichier");

    setSubmitting(true);
    try {
      await HomeworkApi.upload({
        title: title.trim(),
        description: description.trim() || null,
        degree_id: Number(degreeId),
        due_at: dueAt || null,
        file,
      });
      setTitle(""); setDescription(""); setDegreeId(""); setDueAt(""); setFile(null);
      await loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors de l’envoi du devoir.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce devoir ?")) return;
    setDeletingId(id);
    try {
      await HomeworkApi.deleteAsTeacher(id);
      await loadAll();
    } finally {
      setDeletingId(null);
    }
  }

  /* ───────────── Filters & sorting for “Mes devoirs” ───────────── */
  const degreeFilterOptions = useMemo(() => [
    { value: "all", label: "Tous les degrés" },
    ...(degrees ?? []).map(d => ({ value: String(d.id), label: d.name ?? d.title ?? d.label ?? `Degré #${d.id}` })),
  ], [degrees]);

  const filtered = useMemo(() => {
    let rows = Array.isArray(list) ? [...list] : [];

    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter(d =>
        `${d.title||""} ${d.description||""} ${d.subject_name||""}`
          .toLowerCase()
          .includes(needle)
      );
    }
    if (filterDegree !== "all") {
      rows = rows.filter(d => String(d.degree_id ?? d.degree?.id) === filterDegree);
    }
    if (filterStatus !== "all") {
      rows = rows.filter(d => {
        if (!d.due_at) return filterStatus === "no_due";
        return filterStatus === "overdue"
          ? isOverdue(d.due_at)
          : filterStatus === "upcoming"
            ? !isOverdue(d.due_at)
            : true;
      });
    }
    switch (sortBy) {
      case "newest":
        rows.sort((a,b) => new Date(b.created_at||b.updated_at||0) - new Date(a.created_at||a.updated_at||0));
        break;
      case "title":
        rows.sort((a,b) => (a.title||"").localeCompare(b.title||""));
        break;
      default: // soonest (due first; no_due last)
        rows.sort((a,b) => {
          const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
          const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
          return da - db;
        });
    }
    return rows;
  }, [list, q, filterDegree, filterStatus, sortBy]);

  /* ───────────────────────────── Render ───────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Formulaire d’envoi */}
      <Card className="rounded-2xl border-0 shadow-none">
        <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-4">
          <h2 className="text-lg font-semibold">Donner un devoir</h2>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="hw-title">Titre</Label>
              <Input id="hw-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex. : Devoir n°3 – Trigonométrie" />
            </div>

            <div>
              <Label>Niveau (degré)</Label>
              <Select value={degreeId} onValueChange={setDegreeId}>
                <SelectTrigger>
                  <SelectValue placeholder={degreesLoading ? "Chargement…" : "Sélectionner…"} />
                </SelectTrigger>
                <SelectContent>
                  {degreesLoading && <SelectItem value="__loading" disabled>Chargement…</SelectItem>}
                  {!degreesLoading && degrees.length === 0 && <SelectItem value="__empty" disabled>Aucun degré</SelectItem>}
                  {!degreesLoading && degrees.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name ?? d.title ?? d.label ?? `Degré #${d.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Échéance (optionnel)</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label>Fichier</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>

            <div className="md:col-span-2">
              <Label>Description (optionnel)</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Consignes, barème, ressources…" />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Mes devoirs + outils de gestion */}
      <Card className="rounded-2xl border-0 shadow-none">
        <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Mes devoirs</h2>

          {/* Toolbar responsive */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="w-full sm:w-64">
              <Input placeholder="Rechercher (titre, description, matière)…" value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>

            <Select value={filterDegree} onValueChange={setFilterDegree}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrer par degré" />
              </SelectTrigger>
              <SelectContent>
                {degreeFilterOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="no_due">Sans échéance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Trier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soonest">Échéance (proche → loin)</SelectItem>
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="title">Titre (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun devoir.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => {
                const degreeName = degreeNameOf(d);
                const overdue = isOverdue(d.due_at);
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row ${overdue ? "border-destructive/40" : ""}`}
                  >
                    <div className="w-full">
                      <div className="font-medium line-clamp-2">{d.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {d.subject_name ? `${d.subject_name} · ` : ""}
                        Degré: {degreeName}
                        {d.filesize_human ? ` · ${d.filesize_human}` : ""}
                        {d.due_at ? ` · Échéance: ${fmtDate(d.due_at)}${overdue ? " (en retard)" : ""}` : ""}
                      </div>
                      {d.file_url ? (
                        <a className="text-sm underline break-all" href={d.file_url} target="_blank" rel="noreferrer">
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
