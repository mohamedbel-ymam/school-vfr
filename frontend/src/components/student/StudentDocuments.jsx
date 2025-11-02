// src/components/student/StudentDocuments.jsx
import { useEffect, useMemo, useState } from "react";
import DocumentApi from "../../services/api/DocumentApi";

// shadcn/ui
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Toggle } from "../ui/toggle";

// Icons
import {
  Download, Eye, ExternalLink, Copy, MoreHorizontal,
  FileText, FileImage, FileArchive, FileSpreadsheet, File,
  LayoutGrid, List
} from "lucide-react";

// Small helpers
const getExt = (name = "") => (name.split(".").pop() || "").toLowerCase();
const fileIcon = (ext) => {
  if (["pdf"].includes(ext)) return FileText;
  if (["png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext)) return FileImage;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return FileArchive;
  if (["xls","xlsx","csv","ods"].includes(ext)) return FileSpreadsheet;
  return File;
};
const canPreview = (ext) => ["pdf","png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext);

// Basic fuzzy matcher
const matches = (doc, q) => {
  if (!q) return true;
  const hay = `${doc.title ?? ""} ${doc.teacher_name ?? ""} ${doc.subject_name ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase().trim());
};

export default function StudentDocuments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [grid, setGrid] = useState(true);

  // Preview state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await DocumentApi.listStudent();
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setList(Array.isArray(rows) ? rows : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build subject options from data
  const subjects = useMemo(() => {
    const s = new Set();
    list.forEach(d => d.subject_name && s.add(d.subject_name));
    return ["all", ...Array.from(s)];
  }, [list]);

  const filtered = useMemo(() => {
    let x = list.filter(d => matches(d, query));
    if (subjectFilter !== "all") {
      x = x.filter(d => d.subject_name === subjectFilter);
    }
    switch (sortBy) {
      case "size":
        x.sort((a,b) => (a.filesize || 0) - (b.filesize || 0));
        break;
      case "title":
        x.sort((a,b) => (a.title || "").localeCompare(b.title || ""));
        break;
      default: // newest
        x.sort((a,b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
    }
    return x;
  }, [list, query, subjectFilter, sortBy]);

  const onPreview = (doc) => {
    setActive(doc);
    setOpen(true);
  };

  const onCopy = async (url) => {
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  return (
    <>
       <Card className="border-0 shadow-none">
         <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Documents</h2>
             <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:w-64">
                <Input
                  placeholder="Rechercher (titre, prof, matière)…"
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                />
              </div>

              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "Toutes les matières" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Trier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="title">Titre (A→Z)</SelectItem>
                  <SelectItem value="size">Taille (croissante)</SelectItem>
                </SelectContent>
              </Select>

              <Toggle
                pressed={grid}
                onPressedChange={setGrid}
                aria-label="Basculer grille/liste"
                className="ml-0 md:ml-2"
              >
                {grid ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Toggle>
            </div>
          </div>

          {loading ? (
            <div className={grid ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
              {Array.from({length:6}).map((_,i)=>(
                <Skeleton key={i} className={grid ? "h-24" : "h-20"} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun document.</div>
          ) : grid ? (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">              {filtered.map((d)=>(
                <DocCard key={d.id} d={d} onPreview={onPreview} onCopy={onCopy} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d)=>(
                <DocRow key={d.id} d={d} onPreview={onPreview} onCopy={onCopy} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate">{active?.title || "Aperçu"}</DialogTitle>
          </DialogHeader>
          {active ? <PreviewPane doc={active} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------- Subcomponents --------------------------- */

function DocCard({ d, onPreview, onCopy }) {
  const ext = getExt(d.filename || d.title || "");
  const Icon = fileIcon(ext);

  return (
    <div className="rounded-xl border p-3 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{d.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""}{d.section_name ? ` · ${d.section_name}` : ""} · {d.filesize_human}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {d.subject_name && <Badge variant="outline">{d.subject_name}</Badge>}
            {d.section_name && <Badge variant="secondary">{d.section_name}</Badge>}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {canPreview(ext) && (
              <Button size="sm" variant="secondary" onClick={()=>onPreview(d)}>
                <Eye className="mr-2 h-4 w-4" /> Aperçu
              </Button>
            )}
            <Button size="sm" asChild>
              <a href={d.file_url} download>
                <Download className="mr-2 h-4 w-4" /> Télécharger
              </a>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={d.file_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir dans un nouvel onglet
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={()=>onCopy(d.file_url)}>
                  <Copy className="mr-2 h-4 w-4" /> Copier le lien
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ d, onPreview, onCopy }) {
  const ext = getExt(d.filename || d.title || "");
  const Icon = fileIcon(ext);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{d.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""}{d.section_name ? ` · ${d.section_name}` : ""} · {d.filesize_human}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canPreview(ext) && (
            <Button size="sm" variant="secondary" onClick={()=>onPreview(d)}>
              <Eye className="mr-2 h-4 w-4" /> Aperçu
            </Button>
          )}
          <Button size="sm" asChild>
            <a href={d.file_url} download>
              <Download className="mr-2 h-4 w-4" /> Télécharger
            </a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={d.file_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir dans un nouvel onglet
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={()=>onCopy(d.file_url)}>
                <Copy className="mr-2 h-4 w-4" /> Copier le lien
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ doc }) {
  const ext = getExt(doc.filename || doc.title || "");
  const url = doc.file_url;

  if (["png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext)) {
    return (
      <div className="max-h-[70vh] overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={doc.title} className="mx-auto max-h-[70vh]" />
      </div>
    );
  }
  if (ext === "pdf") {
    return (
      <div className="h-[70vh]">
        {/* Browser PDF viewer (works great if server allows inline) */}
        <iframe
          src={url}
          title={doc.title}
          className="h-full w-full rounded-md border"
        />
      </div>
    );
  }
  // Fallback
  return (
    <div className="text-sm text-muted-foreground">
      Aucun aperçu disponible pour ce type de fichier. Utilisez “Télécharger” ou “Ouvrir dans un nouvel onglet”.
    </div>
  );
}
