// src/components/student/StudentDevoirs.jsx
import { useEffect, useMemo, useState } from "react";
import HomeworkApi from "../../services/api/HomeworkApi";

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

// icons
import {
  Download, ExternalLink, Eye, Copy, MoreHorizontal,
  LayoutGrid, List, AlarmClock, CheckCircle2, AlertTriangle
} from "lucide-react";

/* --------------------------- helpers --------------------------- */
const getExt = (name = "") => (name.split(".").pop() || "").toLowerCase();
const canPreview = (ext) => ["pdf","png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : "—";

function dueInfo(due_at) {
  if (!due_at) return { label: "Sans échéance", variant: "outline" };
  const now = Date.now();
  const due = new Date(due_at).getTime();
  const diff = due - now;
  if (diff < 0) return { label: "En retard", variant: "destructive" };
  const hrs = Math.ceil(diff / 3_600_000);
  if (hrs <= 24) return { label: `Dans ${hrs} h`, variant: "secondary" };
  const days = Math.ceil(hrs / 24);
  return { label: `Dans ${days} j`, variant: "outline" };
}

/* --------------------------- component --------------------------- */
export default function StudentDevoirs() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all"); // all | upcoming | overdue | no_due
  const [sortBy, setSortBy] = useState("soonest"); // soonest | newest | title
  const [grid, setGrid] = useState(true);

  // preview state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await HomeworkApi.listStudent();
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setList(Array.isArray(rows) ? rows : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = useMemo(() => ["all", ...Array.from(new Set(list.map(d => d.subject_name).filter(Boolean))).sort()], [list]);

  const filtered = useMemo(() => {
    let x = list;

    // search
    if (query.trim()) {
      const q = query.toLowerCase();
      x = x.filter(d => `${d.title||""} ${d.teacher_name||""} ${d.subject_name||""}`.toLowerCase().includes(q));
    }

    // subject filter
    if (subject !== "all") x = x.filter(d => d.subject_name === subject);

    // status filter
    if (status !== "all") {
      const now = Date.now();
      x = x.filter(d => {
        const due = d.due_at ? new Date(d.due_at).getTime() : null;
        if (status === "no_due") return !due;
        if (!due) return false;
        if (status === "overdue") return due < now;
        if (status === "upcoming") return due >= now;
        return true;
      });
    }

    // sort
    switch (sortBy) {
      case "newest":
        x.sort((a,b) => new Date(b.created_at||b.updated_at||0) - new Date(a.created_at||a.updated_at||0));
        break;
      case "title":
        x.sort((a,b) => (a.title||"").localeCompare(b.title||""));
        break;
      default: // soonest (due first; no_due last)
        x.sort((a,b) => {
          const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
          const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
          return da - db;
        });
    }
    return x;
  }, [list, query, subject, status, sortBy]);

  const onPreview = (d) => { setActive(d); setOpen(true); };
  const onCopy = async (url) => { try { await navigator.clipboard.writeText(url); } catch {} };

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardContent className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Devoirs</h2>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <div className="w-full sm:w-64">
                <Input placeholder="Rechercher (titre, prof, matière)…" value={query} onChange={e=>setQuery(e.target.value)} />
              </div>

              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Matière" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s==="all"?"Toutes les matières":s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="no_due">Sans échéance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Trier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soonest">Échéance (proche → loin)</SelectItem>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="title">Titre (A→Z)</SelectItem>
                </SelectContent>
              </Select>

              <Toggle pressed={grid} onPressedChange={setGrid} aria-label="Grille/Liste">
                {grid ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Toggle>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className={grid ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>
              {Array.from({length:6}).map((_,i)=><Skeleton key={i} className={grid ? "h-28" : "h-20"} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun devoir.</div>
          ) : grid ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map(d => <HWCard key={d.id} d={d} onPreview={onPreview} onCopy={onCopy} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(d => <HWRow key={d.id} d={d} onPreview={onPreview} onCopy={onCopy} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-3xl md:max-w-4xl xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="truncate">{active?.title || "Aperçu du devoir"}</DialogTitle>
          </DialogHeader>
          {active ? <PreviewPane doc={active} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------- items --------------------------- */
function HWCard({ d, onPreview, onCopy }) {
  const ext = getExt(d.filename || d.title || "");
  const due = dueInfo(d.due_at);

  return (
    <div className="rounded-xl border p-3 hover:shadow-sm transition">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium line-clamp-2">{d.title}</div>
          <DueBadge due={due} compact />
        </div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} · {d.filesize_human}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {d.subject_name && <Badge variant="outline">{d.subject_name}</Badge>}
          {d.section_name && <Badge variant="secondary">{d.section_name}</Badge>}
          {d.due_at && <Badge variant="outline"><AlarmClock className="h-3 w-3 mr-1" /> {fmtDate(d.due_at)}</Badge>}
          {d.status === "submitted" && <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Remis</Badge>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
              {d.submit_url && (
                <DropdownMenuItem asChild>
                  <a href={d.submit_url}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Remettre
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function HWRow({ d, onPreview, onCopy }) {
  const ext = getExt(d.filename || d.title || "");
  const due = dueInfo(d.due_at);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium truncate">{d.title}</div>
            <DueBadge due={due} />
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {d.teacher_name}{d.subject_name ? ` · ${d.subject_name}` : ""} · {d.filesize_human}
            {d.due_at ? ` · Échéance: ${fmtDate(d.due_at)}` : ""}
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
                  <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={()=>onCopy(d.file_url)}>
                <Copy className="mr-2 h-4 w-4" /> Copier le lien
              </DropdownMenuItem>
              {d.submit_url && (
                <DropdownMenuItem asChild>
                  <a href={d.submit_url}><CheckCircle2 className="mr-2 h-4 w-4" /> Remettre</a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function DueBadge({ due, compact=false }) {
  const { label, variant } = due;
  const Icon = label === "En retard" ? AlertTriangle : AlarmClock;
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      <Icon className={`mr-1 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} /> {label}
    </Badge>
  );
}

/* --------------------------- preview --------------------------- */
function PreviewPane({ doc }) {
  const ext = getExt(doc.filename || doc.title || "");
  const url = doc.file_url;

  if (["png","jpg","jpeg","webp","gif","bmp","svg"].includes(ext)) {
    return (
      <div className="max-h-[65vh] sm:max-h-[70vh] md:max-h-[75vh] overflow-auto">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={url} className="mx-auto max-h-[75vh]" />
      </div>
    );
  }
  if (ext === "pdf") {
    return (
      <div className="h-[65vh] sm:h-[70vh] md:h-[75vh]">
        <iframe src={url} title={doc.title} className="h-full w-full rounded-md border" />
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Aucun aperçu pour ce type. Utilisez “Télécharger”.</div>;
}
