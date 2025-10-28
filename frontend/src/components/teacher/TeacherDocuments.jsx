import { useEffect, useState, useMemo } from "react";
import DocumentApi from "../../services/api/DocumentApi";
import { axiosClient } from "../../api/axios";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

/* Small helpers */
const pad = (s) => (s == null ? "" : String(s));
const isNumericId = (v) => /^\d+$/.test(String(v ?? "").trim());

/** Try several teacher-safe endpoints; never throw, just return [] on error */
async function fetchTeacherDegrees() {
  const candidates = [
    "/enseignant/degrees",
    "/teacher/degrees",
    "/me/degrees",
    "/enseignant/my-degrees",
    "/me/classes", // some APIs expose classes but include degree_id/name inside
  ];
  for (const url of candidates) {
    try {
      const res = await axiosClient.get(url, { params: { per_page: 1000 } });
      const raw = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(raw) || raw.length === 0) continue;

      // map & sanitize; keep only items with a numeric ID (so SelectItem never gets "")
      const cleaned = raw
        .map((it) => {
          const id =
            it?.id ??
            it?.value ??
            it?.degree_id ??
            it?.classe_id ??
            it?.class_id ??
            null;
          const name =
            it?.name ??
            it?.title ??
            it?.label ??
            it?.degree_name ??
            it?.niveau_name ??
            it?.level_name ??
            it?.class_name ??
            it?.classe_name ??
            null;

          return { id, name };
        })
        .filter((d) => isNumericId(d.id) && pad(d.name).trim() !== "")
        .map((d) => ({ id: String(d.id).trim(), name: String(d.name).trim() }));

      if (cleaned.length) return cleaned;
    } catch {
      // try next endpoint
    }
  }

  // As a very last resort, try admin degrees (may 403) but do not crash
  try {
    const res = await axiosClient.get("/admin/degrees", {
      params: { per_page: 1000 },
    });
    const arr = res?.data?.data ?? res?.data ?? [];
    const cleaned = (Array.isArray(arr) ? arr : [])
      .map((d) => ({ id: d?.id, name: d?.name ?? d?.title ?? d?.label }))
      .filter((d) => isNumericId(d.id) && pad(d.name).trim() !== "")
      .map((d) => ({ id: String(d.id), name: String(d.name).trim() }));
    return cleaned;
  } catch {
    return [];
  }
}

export default function TeacherDocuments() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  /** empty string means "no selection" → placeholder is shown */
  const [degreeId, setDegreeId] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null); // id being deleted

  async function loadAll() {
    setLoading(true);
    setDegreesLoading(true);
    try {
      const [degSettled, docsSettled] = await Promise.allSettled([
        fetchTeacherDegrees(),
        DocumentApi.listTeacher(),
      ]);

      const degList =
        degSettled.status === "fulfilled" && Array.isArray(degSettled.value)
          ? degSettled.value
          : [];
      setDegrees(degList);

      const docs =
        docsSettled.status === "fulfilled" ? docsSettled.value : null;
      const listDocs =
        docs?.data?.data?.data ?? docs?.data?.data ?? docs?.data ?? [];
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
    // Ensure there is NO item with value=""
    return (degrees ?? [])
      .filter((d) => isNumericId(d.id) && pad(d.name).trim() !== "")
      .map((d) => ({ value: String(d.id), label: d.name }));
  }, [degrees]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      alert("Choisissez un fichier");
      return;
    }
    setSubmitting(true);
    try {
      await DocumentApi.upload({
        title: title.trim(),
        description: description.trim() || null,
        degree_id: degreeId ? Number(degreeId) : null, // null = “sans niveau”
        file,
      });
      setTitle("");
      setDescription("");
      setDegreeId(""); // back to placeholder
      setFile(null);
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    try {
      await DocumentApi.deleteAsTeacher(id);
      await loadAll();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        alert(
          "Suppression refusée (403). Vous n'avez pas l'autorisation de supprimer ce document."
        );
      } else if (status === 404) {
        alert("Document introuvable (404).");
      } else {
        alert("Échec de la suppression.");
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
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Niveau (degré)</Label>
              <Select
                value={degreeId} // "" => placeholder
                onValueChange={(v) => setDegreeId(v)} // v is ALWAYS non-empty string from our items
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      degreesLoading ? "Chargement…" : "Optionnel (aucun)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {degreesLoading && (
                    <SelectItem value="__loading" disabled>
                      Chargement…
                    </SelectItem>
                  )}
                  {!degreesLoading && degreeOptions.length === 0 && (
                    <SelectItem value="__empty" disabled>
                      Aucun degré disponible
                    </SelectItem>
                  )}
                  {degreeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Laisser vide si le document n’est pas lié à un degré.
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
                <div className="text-sm text-muted-foreground">
                  Aucun document.
                </div>
              )}
              {list.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row"
                >
                  <div className="w-full">
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.subject_name ? `${d.subject_name} · ` : ""}
                      Degré: {d.degree?.name ?? d.degree_id ?? "—"} ·{" "}
                      {d.filesize_human}
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
                    disabled={deleting === d.id}
                  >
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
