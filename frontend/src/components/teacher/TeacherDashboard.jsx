import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

import {
  FileText,
  Upload,
  Calendar,
  BookOpen,
  ClipboardList,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  QrCode,
  Download,
} from "lucide-react";

// APIs
import DocumentApi from "../../services/api/DocumentApi";
import HomeworkApi from "../../services/api/HomeworkApi";
import DegreeApi from "../../services/api/admin/DegreeApi";

import { useAuth } from "../../context/AuthContext";
import { TEACHER_SCHEDULE_ROUTE } from "../../router/pahts";

/* ------------------------------------------------------------
 * Utils
 * ------------------------------------------------------------ */
const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

function labelFromSubject(code, fallback = "Matière") {
  const c = (code || "").toUpperCase().replace(/[^A-Z]/g, "");
  switch (c) {
    case "MATH":    return "Mathématiques";
    case "PC":      return "Physique & Chimie";
    case "SVT":     return "SVT";
    case "FR":      return "Français";
    case "ANG":     return "Anglais";
    case "ARAB":    return "Arabe";
    case "INFO":    return "Informatique & Algorithmique";
    case "HISGEO":  return "Histoire-Géographie";
    case "EDUCISL": return "Éducation islamique";
    default:        return fallback;
  }
}

function Header({ title, icon }) {
  return (
    <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/60">
      <div className="flex items-center gap-2.5 text-foreground font-bold text-base">
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <span>{title}</span>
      </div>
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-dashed border-border p-6 text-center sm:text-left bg-muted/20">
      <p className="text-xs sm:text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();

  const teacherFullName =
    `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim() || user?.name || "Enseignant";

  const subjectCode =
    user?.subject?.code ||
    user?.subject_code ||
    null;

  const subjectName =
    user?.subject?.name ||
    user?.subject_name ||
    "Matière";

  const subjectLabel = labelFromSubject(subjectCode, subjectName);

  // Data
  const [docs, setDocs] = useState([]);
  const [hws, setHws] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [d, h, deg] = await Promise.all([
          DocumentApi.listTeacher({ per_page: 5 }),
          HomeworkApi.listTeacher({ per_page: 5 }),
          DegreeApi.publicList({ per_page: 1000 }),
        ]);

        setDocs(unwrap(d));
        setHws(unwrap(h));

        const degList =
          Array.isArray(deg?.data?.data)
            ? deg.data.data
            : Array.isArray(deg?.data)
            ? deg.data
            : [];

        setDegrees(degList);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Degree name resolver
  const degreeNameOf = useMemo(() => {
    const map = new Map();
    degrees.forEach((d) => {
      map.set(String(d.id), d.name ?? `Degré #${d.id}`);
    });

    return (row) => {
      if (row?.degree?.name) return row.degree.name;
      if (row?.degree_name) return row.degree_name;
      if (row?.degree_id && map.get(String(row.degree_id)))
        return map.get(String(row.degree_id));
      return row?.degree_id ? `Degré #${row.degree_id}` : "—";
    };
  }, [degrees]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Espace Enseignant • Direction Pédagogique</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Bonjour, Pr. {teacherFullName} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Gérez vos cours, publiez des devoirs surveillés et validez l'assiduité de vos classes.
            </p>
          </div>

          <div className="shrink-0">
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold rounded-full">
              {subjectLabel}
            </Badge>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div className="mt-6 pt-5 border-t border-border/60 flex flex-wrap gap-2.5">
          <Link to="/enseignant/attendance">
            <Button size="sm" className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
              <QrCode className="h-4 w-4" />
              <span>Faire l'appel (Scan QR)</span>
            </Button>
          </Link>

          <Link to="/enseignant/devoirs">
            <Button size="sm" className="gap-2 rounded-xl font-semibold shadow-sm">
              <ClipboardList className="h-4 w-4" />
              <span>Donner un devoir</span>
            </Button>
          </Link>

          <Link to="/enseignant/documents">
            <Button size="sm" variant="secondary" className="gap-2 rounded-xl border border-border">
              <Upload className="h-4 w-4" />
              <span>Déposer un document</span>
            </Button>
          </Link>

          <Link to={TEACHER_SCHEDULE_ROUTE}>
            <Button size="sm" variant="outline" className="gap-2 rounded-xl border border-border">
              <Calendar className="h-4 w-4" />
              <span>Mon emploi du temps</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Documents actifs</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {loading ? "…" : docs.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Supports partagés</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Devoirs publiés</span>
            <ClipboardList className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {loading ? "…" : hws.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Évaluations et exercices</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Matière d'enseignement</span>
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground truncate">
            {subjectLabel}
          </div>
          <div className="text-[11px] text-muted-foreground">Spécialité certifiée</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Niveaux pris en charge</span>
            <CheckCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {degrees.length ? Math.min(degrees.length, 6) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">Groupes et filières</div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOCUMENTS */}
        <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Header
              title="Mes derniers documents publiés"
              icon={<FileText className="h-4 w-4" />}
            />

            <div className="p-5">
              {docs.length === 0 ? (
                <EmptyState
                  text="Aucun support de cours ou fiche d'exercices récent."
                  action={
                    <Link to="/enseignant/documents">
                      <Button size="sm" className="gap-2 rounded-xl">
                        <Upload className="h-4 w-4" />
                        Partager un document
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="p-3.5 rounded-2xl border border-border bg-background/50 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-sm text-foreground truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.subject_name ? `${d.subject_name} • ` : ""}
                          Degré : <strong className="text-foreground">{degreeNameOf(d)}</strong>
                        </p>
                      </div>

                      {d.file_url && (
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold shrink-0 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Fichier</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* HOMEWORKS */}
        <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Header
              title="Mes derniers devoirs assignés"
              icon={<BookOpen className="h-4 w-4" />}
            />

            <div className="p-5">
              {hws.length === 0 ? (
                <EmptyState
                  text="Aucun devoir ou travail à la maison récent."
                  action={
                    <Link to="/enseignant/devoirs">
                      <Button size="sm" className="gap-2 rounded-xl">
                        <ClipboardList className="h-4 w-4" />
                        Donner un devoir
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {hws.map((d) => (
                    <li
                      key={d.id}
                      className="p-3.5 rounded-2xl border border-border bg-background/50 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-sm text-foreground truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.subject_name ? `${d.subject_name} • ` : ""}
                          Degré : <strong className="text-foreground">{degreeNameOf(d)}</strong>
                          {d.due_at && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {" "}• Échéance : {new Date(d.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>

                      {d.file_url && (
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold shrink-0 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Sujet</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
