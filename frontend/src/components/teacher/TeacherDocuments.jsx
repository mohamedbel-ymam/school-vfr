import { useEffect, useMemo, useState } from "react";
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const NONE_VALUE = "__none__"; // explicit "no degree" value (never empty string)

const safeStr = (v) => (v == null ? "" : String(v));
const isNumId = (v) => /^\d+$/.test(safeStr(v).trim());

/** Try several teacher-friendly endpoints; return [] on any failure */
async function fetchTeacherDegrees() {
  const candidates = [
    "/enseignant/degrees",
    "/teacher/degrees",
    "/me/degrees",
    "/enseignant/my-degrees",
    "/me/classes", // sometimes classes carry degree info
  ];

  for (const url of candidates) {
    try {
      const res = await axiosClient.get(url, { params: { per_page: 1000 } });
      const arr = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const cleaned = arr
        .map((it) => {
          const id =
            it?.id ??
            it?.value ??
            it?.degree_id ??
            it?.class_id ??
            it?.classe_id ??
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
        .filter((d) => isNumId(d.id) && safeStr(d.name).trim() !== "")
        .map((d) => ({ id: String(d.id), name: String(d.name).trim() }));

      if (cleaned.length) return cleaned;
    } catch {
      /* try next */
    }
  }

  // Last resort: admin degrees (may 403; ignore errors)
  try {
    const res = await axiosClient.get("/admin/degrees", {
      params: { per_page: 1000 },
    });
    const arr = res?.data?.data ?? res?.data ?? [];
    const cleaned = (Array.isArray(arr) ? arr : [])
      .map((d) => ({ id: d?.id, name: d?.name ?? d?.title ?? d?.label }))
      .filter((d) => isNumId(d.id) && safeStr(d.name).trim() !== "")
      .map((d) => ({ id: String(d.id), name: String(d.name).trim() }));
    return cleaned;
  } catch {
    return [];
  }
}

/** Robust delete that tries multiple endpoints; throws last error if all fail */
async function deleteTeacherDocRobust(id) {
  // 1) Try the service first
  try {
    return await DocumentApi.deleteAsTeacher(id);
  } catch (e1) {
    // 2) Try a set of common endpoints directly
    const candidates = [
      `/enseignant/documents/${id}`,
      `/teacher/documents/${id}`,
      `/me/documents/${id}`,
      `/documents/${id}`, // generic
    ];
    let lastErr = e1;
    for (const url of candidates) {
      try {
        return await axiosClient.delete(url);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function TeacherDocuments() {
  const [degrees, setDegrees] = useState([]);
  const [degreesLoading, setDegreesLoading] = useState(true);
  const [degError, setDegError] = useState("");

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // use explicit NONE_VALUE so Select never has empty string
  const [degreeId, setDegreeId] = useState(NONE_VALUE);
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function loadAll() {
    setLoading(true);
    setDegreesLoading(true);
    setDegError("");
    try {
      const [degSettled, docsSettled] = await Promise.allSettled([
        fetchTeacherDegrees(),
        DocumentApi.listTeacher(),
      ]);

      if (degSettled.status === "fulfilled") {
        setDegrees(degSettled.value ?? []);
      } else {
        setDegrees([]);
        setDegError("Impossible de charger la liste des degrés.");
      }

      if (docsSettled.status === "fulfilled") {
        const docs = docsSettled.value;
        const listDocs =
          docs?.data?.data?.data ?? docs?.data?.data ?? docs?.data ?? [];
        setList(Array.isArray(listDocs) ? listDocs : []);
      } else {
        setList([]);
      }
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const degreeOptions = useMemo(() => {
    // Always include the explicit "no degree" option first
    const base = [{ value: NONE_VALUE, label: "— Aucun degré —" }];
    const fromApi = (degrees ?? [])
      .filter((d) => isNumId(d.id) && safeStr(d.name).trim() !== "")
      .map((d) => ({ value: String(d.id), label: d.name }));
    return [...base, ...fromApi];
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
        degree_id: degreeId === NONE_VALUE ? null : Number(degreeId),
        file,
      });
      // reset
      setTitle("");
      setDescription("");
      setDegreeId(NONE_VALUE);
      setFile(null);
      await loadAll();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Échec de l’envoi du document.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    try {
      await deleteTeacherDocRobust(id);
      await loadAll();
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403) {
        alert(
          "Suppression refusée (403). Vous n’avez pas l’autorisation pour ce document."
        );
      } else if (st === 404) {
        alert("Document introuvable (404).");
      } else if (e?.code === "ERR_NETWORK") {
        alert(
          "Réseau indisponible. Vérifiez la connexion du serveur (ERR_NETWORK)."
        );
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

          {degError && (
            <div className="text-xs text-amber-600 border border-amber-300 rounded-md p-2 bg-amber-50">
              {degError} Vous pouvez quand même téléverser un document en
              laissant “Aucun degré”.
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadAll}
                >
                  Réessayer le chargement des degrés
                </Button>
              </div>
            </div>
          )}

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
                value={degreeId}
                onValueChange={(v) => setDegreeId(v)}
                // value is NEVER "" because we default/use NONE_VALUE
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Always show the explicit "no degree" item first */}
                  <SelectItem value={NONE_VALUE}>— Aucun degré —</SelectItem>

                  {degreesLoading && (
                    <SelectItem value="__loading" disabled>
                      Chargement…
                    </SelectItem>
                  )}

                  {!degreesLoading && degreeOptions.slice(1).length === 0 && (
                    <SelectItem value="__empty" disabled>
                      Aucun degré disponible
                    </SelectItem>
                  )}

                  {degreeOptions.slice(1).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
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
                      {d.filesize_human ?? ""}
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
