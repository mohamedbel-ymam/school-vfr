import { useEffect, useMemo, useState } from "react";
import DocumentApi from "../../services/api/DocumentApi";
import DegreeApi from "../../services/api/admin/DegreeApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ───────────────────────────── Helpers ───────────────────────────── */
const NONE_VALUE = "__none__"; // sentinel for “Aucun degré”

const unwrapArray = (res) =>
  Array.isArray(res?.data?.data) ? res.data.data :
  Array.isArray(res?.data)       ? res.data      :
  [];

/** Load degrees from the public endpoint (no auth issues). */
async function loadPublicDegrees() {
  try {
    // Prefer DocumentApi.degrees() which calls /degrees?per_page=1000
    const r = await DocumentApi.degrees();
    const arr = unwrapArray(r);
    if (arr.length) return arr;

    // Fallback: DegreeApi.publicList()
    const r2 = await DegreeApi.publicList({ per_page: 1000 });
    return unwrapArray(r2);
  } catch {
    return [];
  }
}

/* ───────────────────────────── Component ───────────────────────────── */
export default function TeacherDocuments() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [degreeId, setDegreeId] = useState(NONE_VALUE);
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const degreeOptions = useMemo(() => {
    const opts = (degrees ?? []).map((d) => ({
      value: String(d.id),
      label: d.name ?? d.title ?? d.label ?? `Degré #${d.id}`,
    }));
    return [{ value: NONE_VALUE, label: "— Aucun degré —" }, ...opts];
  }, [degrees]);

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

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      alert("Choisissez un fichier.");
      return;
    }
    setSubmitting(true);
    try {
      // When no degree selected, send empty string so backend treats it as null
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
      const msg = e?.response?.data?.message || e?.message || "Échec de l’envoi du document.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeletingId(id);
    try {
      await DocumentApi.deleteAsTeacher(id); // DELETE /enseignant/documents/{id}
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
                  {/* Always a non-empty value for SelectItem */}
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
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
              {list.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucun document.</div>
              )}

              {list.map((d) => {
                const degreeName = d?.degree?.name ?? d?.degree_name ?? (d?.degree_id ? `Degré #${d.degree_id}` : "—");
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row"
                  >
                    <div className="w-full">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.subject_name ? `${d.subject_name} · ` : ""}
                        Degré: {degreeName} · {d.filesize_human ?? ""}
                      </div>
                      {d.file_url ? (
                        <a
                          className="text-sm underline break-all"
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Télécharger
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          (lien indisponible)
                        </span>
                      )}
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => removeItem(d.id)}
                      disabled={deletingId === d.id}
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
