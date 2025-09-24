import { useEffect, useState } from "react";
import DocumentApi from "../../../services/api/DocumentApi";
import { Card, CardContent } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";

const ALL = "all";

export default function AdminDocuments(){
  const [degrees, setDegrees] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use a non-empty sentinel instead of ""
  const [filters, setFilters] = useState({ degree_id: ALL, search: "" });

  async function load(){
    setLoading(true);
    const [deg, docs] = await Promise.all([
      DocumentApi.degrees(),
      DocumentApi.listAdmin({
        degree_id: filters.degree_id === ALL ? undefined : filters.degree_id,
        search: filters.search || undefined,
      }),
    ]);
    setDegrees(deg.data?.data ?? deg.data ?? []);
    setList(docs.data?.data?.data ?? docs.data?.data ?? []);
    setLoading(false);
  }

  useEffect(()=>{ load(); }, []);              // initial
  useEffect(()=>{ load(); }, [filters.degree_id]); // when the degree filter changes

  async function remove(id){
    if (!confirm("Supprimer ce document ?")) return;
    await DocumentApi.deleteAsAdmin(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm font-medium mb-1">Filtrer par niveau</div>
            <Select
              value={filters.degree_id}
              onValueChange={(v)=>setFilters(f=>({ ...f, degree_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous…" />
              </SelectTrigger>
              <SelectContent>
                {/* Never use value="" with Radix SelectItem */}
                <SelectItem value={ALL}>Tous</SelectItem>
                {(degrees ?? []).map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
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
          <h2 className="text-lg font-semibold mb-4">Tous les documents</h2>
          {loading ? "Chargement…" : (
            <div className="space-y-3">
              {list.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucun document.</div>
              )}
              {list.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} ·
                      {" "}Niveau: {d.degree?.name ?? d.degree_id} · {d.filesize_human}
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
