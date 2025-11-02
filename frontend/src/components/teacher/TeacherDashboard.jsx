// src/components/teacher/TeacherDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { FileText, Upload, Calendar, BookOpen, ClipboardList } from "lucide-react";

import DocumentApi from "../../services/api/DocumentApi";
import HomeworkApi from "../../services/api/HomeworkApi";
import DegreeApi from "../../services/api/admin/DegreeApi"; // ⬅️ added

import SubjectBackground from "./SubjectBackground.jsx";
import { SUBJECT_THEMES, guessSubjectKey } from "./SubjectThemes.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { TEACHER_SCHEDULE_ROUTE } from "../../router/index.jsx";

const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

// Libellé FR fiable selon le code du seeder
function labelFromSubject(code, nameFallback = "Matière") {
  const c = (code || "").toUpperCase().replace(/[^A-Z]/g, "");
  switch (c) {
    case "MATH": return "Mathématiques";
    case "PC": return "Physique & Chimie";
    case "SVT": return "Biologie & Géologie";
    case "ANG": return "Anglais";
    case "HISGEO": return "Histoire-Géographie";
    case "ARAB": return "Arabe";
    case "EDUCISL": return "Études islamiques";
    case "FR": return "Français";
    case "INFO": return "Informatique";
    default: return nameFallback;
  }
}

export default function TeacherDashboard() {
  const { user } = useAuth(); // { firstname, lastname, subject?: { name, code } ... }
  const [docs, setDocs] = useState([]);
  const [hws, setHws] = useState([]);

  // ⬇️ Degrees for id→name fallback
  const [degrees, setDegrees] = useState([]);

  // Source affichée sur le dashboard
  const [displaySubject, setDisplaySubject] = useState({ name: "Matière", code: null });

  // 1) depuis l'utilisateur
  useEffect(() => {
    const name =
      user?.subject?.name ||
      user?.subject_name ||
      user?.teacher_subject ||
      "Matière";

    const code =
      user?.subject?.code ||
      user?.subject_code ||
      null;

    setDisplaySubject({ name, code });
  }, [user]);

  // Charger derniers items + degrés (pour afficher le nom du degré)
  useEffect(() => {
    (async () => {
      try {
        const [d, h, deg] = await Promise.all([
          DocumentApi.listTeacher({ per_page: 5 }),
          HomeworkApi.listTeacher({ per_page: 5 }),
          DegreeApi.publicList({ per_page: 1000 }),     // ⬅️ added
        ]);
        setDocs(unwrap(d));
        setHws(unwrap(h));

        // save degrees
        const degList = Array.isArray(deg?.data?.data) ? deg.data.data
                      : Array.isArray(deg?.data) ? deg.data
                      : [];
        setDegrees(degList);

        // si matière absente côté user, déduire depuis les items
        if (!user?.subject?.code && !user?.subject?.name) {
          const guessName = unwrap(h)[0]?.subject_name || unwrap(d)[0]?.subject_name;
          if (guessName) setDisplaySubject((prev) => ({ name: guessName, code: prev.code }));
        }
      } catch {
        // on affiche quand même
      }
    })();
  }, [user]);

  // ⬇️ Helper: donne le nom du degré (embed → flat → map → fallback)
  const degreeNameOf = useMemo(() => {
    const byId = new Map();
    (degrees || []).forEach((g) => {
      byId.set(String(g.id), g.name ?? g.title ?? g.label ?? `Degré #${g.id}`);
    });
    return (row) => {
      if (row?.degree?.name) return row.degree.name;
      if (row?.degree_name)  return row.degree_name;
      if (row?.degree_id && byId.get(String(row.degree_id))) return byId.get(String(row.degree_id));
      return row?.degree_id ? `Degré #${row.degree_id}` : "—";
    };
  }, [degrees]);

  const themeKey = guessSubjectKey(displaySubject.name, displaySubject.code);
  const theme = SUBJECT_THEMES[themeKey] ?? SUBJECT_THEMES.default;
  const subjectLabel = labelFromSubject(displaySubject.code, displaySubject.name);
  const teacherFullName = `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim();

  return (
    <div className="relative">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl mb-6">
        <div className="relative h-[220px] sm:h-[260px] md:h-[300px] rounded-3xl">
          <SubjectBackground theme={theme} clarity="soft" density="high" parallax={0.9} seed={user?.id ?? 17} />
          <div className="relative z-10 h-full flex flex-col justify-center gap-3 p-6 md:p-10">
            <motion.h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Bonjour{teacherFullName ? `, ${teacherFullName}` : ""} 👋
            </motion.h1>
            <div className="flex items-center gap-3">
              <Badge className={`${theme.chip} text-sm px-3 py-1`}>
                {subjectLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Tableau de bord enseignant
              </span>
            </div>

            {/* Boutons */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Link to="/enseignant/documents">
                <Button size="sm" variant="secondary" className="gap-2">
                  <Upload className="h-4 w-4" /> Partager un document
                </Button>
              </Link>
              <Link to="/enseignant/devoirs">
                <Button size="sm" className="gap-2">
                  <ClipboardList className="h-4 w-4" /> Donner un devoir
                </Button>
              </Link>
              <Link to={TEACHER_SCHEDULE_ROUTE}>
                <Button size="sm" variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" /> Mon emploi du temps
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents récents */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Header title="Mes derniers documents" icon={<FileText className="h-4 w-4" />} />
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
                  {docs.slice(0, 5).map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.subject_name ? `${d.subject_name} · ` : ""}
                            Degré: {degreeNameOf(d)}
                            {d.filesize_human ? ` · ${d.filesize_human}` : ""}
                          </p>
                        </div>
                        {d.file_url ? (
                          <a className="text-sm underline shrink-0" href={d.file_url} target="_blank" rel="noreferrer">
                            Télécharger
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Devoirs récents */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Header title="Mes derniers devoirs" icon={<BookOpen className="h-4 w-4" />} />
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
                  {hws.slice(0, 5).map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.subject_name ? `${d.subject_name} · ` : ""}
                            Degré: {degreeNameOf(d)}
                            {d.filesize_human ? ` · ${d.filesize_human}` : ""}
                            {d.due_at ? ` · Échéance: ${new Date(d.due_at).toLocaleString()}` : ""}
                          </p>
                        </div>
                        {d.file_url ? (
                          <a className="text-sm underline shrink-0" href={d.file_url} target="_blank" rel="noreferrer">
                            Télécharger
                          </a>
                        ) : null}
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

function Header({ title, icon }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
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
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
