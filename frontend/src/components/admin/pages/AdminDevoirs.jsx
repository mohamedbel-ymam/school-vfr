import { useEffect, useState } from "react";
import HomeworkApi from "../../../services/api/HomeworkApi";
import { Card, CardContent } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";

const ALL = "all";

export default function AdminDevoirs(){
  const [degrees, setDegrees] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ degree_id: ALL, search: "", due: ALL });

  async function load(){
    setLoading(true);
    const [deg, docs] = await Promise.all([
      HomeworkApi.degrees(),
      HomeworkApi.listAdmin({
        degree_id: filters.degree_id === ALL ? undefined : filters.degree_id,
        search: filters.search || undefined,
        due: filters.due === ALL ? undefined : filters.due, // upcoming | past
      }),
    ]);
    setDegrees(deg.data?.data ?? deg.data ?? []);
    setList(docs.data?.data?.data ?? docs.data?.data ?? []);
    setLoading(false);
  }

  useEffect(()=>{ load(); }, []); // initial
  useEffect(()=>{ load(); }, [filters.degree_id, filters.due]);

  async function remove(id){
    if (!confirm("Supprimer ce devoir ?")) return;
    await HomeworkApi.deleteAsAdmin(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm font-medium mb-1">Niveau</div>
            <Select value={filters.degree_id} onValueChange={(v)=>setFilters(f=>({...f, degree_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Tous…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {(degrees ?? []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Échéance</div>
            <Select value={filters.due} onValueChange={(v)=>setFilters(f=>({...f, due: v }))}>
              <SelectTrigger><SelectValue placeholder="Toutes…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="past">Passées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Recherche</div>
            <div className="flex gap-2">
              <Input
                placeholder="Titre / prof / matière…"
                value={filters.search}
                onChange={e=>setFilters(f=>({ ...f, search: e.target.value }))}
              />
              <Button onClick={load}>Rechercher</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Tous les devoirs</h2>
          {loading ? "Chargement…" : (
            <div className="space-y-3">
              {list.length === 0 && <div className="text-sm text-muted-foreground">Aucun devoir.</div>}
              {list.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} ·
                      {" "}Niveau: {d.degree?.name ?? d.degree_id} · {d.filesize_human}
                      {d.due_at ? ` · Échéance: ${new Date(d.due_at).toLocaleString()}` : ""}
                    </div>
                    <a className="text-sm underline" href={d.file_url} target="_blank" rel="noreferrer">Télécharger</a>
                  </div>
                  <Button variant="destructive" onClick={()=>remove(d.id)}>Supprimer</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
