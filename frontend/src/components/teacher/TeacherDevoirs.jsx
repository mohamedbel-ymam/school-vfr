import { useEffect, useState } from "react";
import HomeworkApi from "../../services/api/HomeworkApi";
import DegreeApi from "../../services/api/admin/DegreeApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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

  async function loadAll() {
    setLoading(true);
    try {
      setDegreesLoading(true);
      const [degRes, items] = await Promise.all([
        DegreeApi.list({ per_page: 1000 }),
        HomeworkApi.listTeacher(),
      ]);

      const degList = Array.isArray(degRes?.data?.data) ? degRes.data.data
                    : Array.isArray(degRes?.data) ? degRes.data
                    : [];
      setDegrees(degList);

      const itemsList = items?.data?.data?.data ?? items?.data?.data ?? [];
      setList(itemsList);
    } finally {
      setDegreesLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Choisissez un fichier");
    await HomeworkApi.upload({
      title,
      description,
      degree_id: degreeId ? Number(degreeId) : null,
      due_at: dueAt || null,
      file,
    });
    setTitle(""); setDescription(""); setDegreeId(""); setDueAt(""); setFile(null);
    await loadAll();
  }

  async function removeItem(id) {
    if (!confirm("Supprimer ce devoir ?")) return;
    await HomeworkApi.deleteAsTeacher(id);
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Donner un devoir</h2>
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
                  {degreesLoading && (
                    <SelectItem value="loading" disabled>Chargement…</SelectItem>
                  )}
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
              <Label>Échéance (optionnel)</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
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
          <h2 className="text-lg font-semibold mb-4">Mes devoirs</h2>
          {loading ? "Chargement…" : (
            <div className="space-y-3">
              {list.length === 0 && <div className="text-sm text-muted-foreground">Aucun devoir.</div>}
              {list.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 gap-3 flex-col sm:flex-row">
                  <div className="w-full">
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.subject_name ? `${d.subject_name} · ` : ""}Degré: {d.degree?.name ?? d.degree_id} · {d.filesize_human}
                      {d.due_at ? ` · Échéance: ${new Date(d.due_at).toLocaleString()}` : ""}
                    </div>
                    <a className="text-sm underline break-all" href={d.file_url} target="_blank" rel="noreferrer">Télécharger</a>
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
