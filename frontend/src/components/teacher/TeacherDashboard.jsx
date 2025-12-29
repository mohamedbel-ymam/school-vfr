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
} from "lucide-react";

// APIs
import DocumentApi from "../../services/api/DocumentApi";
import HomeworkApi from "../../services/api/HomeworkApi";
import DegreeApi from "../../services/api/admin/DegreeApi";

import { useAuth } from "../../context/AuthContext";
import { TEACHER_SCHEDULE_ROUTE } from "../../router";

// ------------------------------------------------------------
// Utils
// ------------------------------------------------------------
const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

// Human-readable subject label (FR)
function labelFromSubject(code, fallback = "Matière") {
  const c = (code || "").toUpperCase().replace(/[^A-Z]/g, "");
  switch (c) {
    case "MATH": return "Mathématiques";
    case "PC": return "Physique & Chimie";
    case "SVT": return "SVT";
    case "FR": return "Français";
    case "ANG": return "Anglais";
    case "ARAB": return "Arabe";
    case "INFO": return "Informatique";
    case "HISGEO": return "Histoire-Géographie";
    case "EDUCISL": return "Éducation islamique";
    default: return fallback;
  }
}

// ------------------------------------------------------------
// Small UI helpers
// ------------------------------------------------------------
function Header({ title, icon }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-slate-800">
        {icon}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <Separator className="mt-3" />
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <p className="text-sm text-slate-500">{text}</p>
      {action}
    </div>
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function TeacherDashboard() {
  const { user } = useAuth();

  const teacherFullName =
    `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim();

  // Subject (always visible)
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
      {/* HEADER */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Bonjour{teacherFullName && `, ${teacherFullName}`}
            </h1>
            <p className="text-sm text-slate-600">
              Tableau de bord enseignant
            </p>
          </div>

          {/* SUBJECT BADGE */}
          <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
            {subjectLabel}
          </Badge>
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/enseignant/documents">
            <Button size="sm" variant="secondary" className="gap-2">
              <Upload className="h-4 w-4" />
              Partager un document
            </Button>
          </Link>

          <Link to="/enseignant/devoirs">
            <Button size="sm" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Donner un devoir
            </Button>
          </Link>

          <Link to={TEACHER_SCHEDULE_ROUTE}>
            <Button size="sm" variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Emploi du temps
            </Button>
          </Link>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOCUMENTS */}
        <Card>
          <CardContent className="p-0">
            <Header
              title="Mes derniers documents"
              icon={<FileText className="h-4 w-4" />}
            />

            <div className="p-4">
              {docs.length === 0 ? (
                <EmptyState
                  text="Aucun document publié."
                  action={
                    <Link to="/enseignant/documents">
                      <Button size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Partager
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {docs.map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {d.subject_name ? `${d.subject_name} · ` : ""}
                            Degré : {degreeNameOf(d)}
                          </p>
                        </div>

                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline shrink-0"
                          >
                            Télécharger
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* HOMEWORKS */}
        <Card>
          <CardContent className="p-0">
            <Header
              title="Mes derniers devoirs"
              icon={<BookOpen className="h-4 w-4" />}
            />

            <div className="p-4">
              {hws.length === 0 ? (
                <EmptyState
                  text="Aucun devoir publié."
                  action={
                    <Link to="/enseignant/devoirs">
                      <Button size="sm" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Donner
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {hws.map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {d.subject_name ? `${d.subject_name} · ` : ""}
                            Degré : {degreeNameOf(d)}
                            {d.due_at
                              ? ` · Échéance : ${new Date(d.due_at).toLocaleString()}`
                              : ""}
                          </p>
                        </div>

                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline shrink-0"
                          >
                            Télécharger
                          </a>
                        )}
                      </div>
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
