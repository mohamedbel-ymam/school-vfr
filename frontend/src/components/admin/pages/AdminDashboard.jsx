import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import {
  FileText,
  ClipboardList,
  Calendar,
  Users,
  FilePlus2,
  ClipboardPlus,
  Settings2,
  ShieldCheck,
  LineChart as LineChartIcon,
  Bell,
} from "lucide-react";

// Charts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// APIs existantes de ton projet (on reste prudents en vérifiant les méthodes)
import DocumentApi from "../../../services/api/DocumentApi.js";
import HomeworkApi from "../../../services/api/HomeworkApi.js";

// On réutilise le background animé générique
import SubjectBackground from "../../teacher/SubjectBackground.jsx";

import { useAuth } from "../../../context/AuthContext.jsx";

const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

// Thème spécial ADMIN (motifs engrenages / étoiles / losanges)
const ADMIN_THEME = {
  from: "from-slate-600/20",
  to: "to-sky-600/10",
  ring: "ring-slate-300/30",
  chip: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  motifs: ["⚙", "◆", "▦", "✦", "▤", "∞"],
};

// Utilitaires
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function rangeDays(n = 14) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

function buildDailySeries(items, createdKey = "created_at", label = "Valeur") {
  // Construit une série par jour (14 derniers jours) à partir de created_at
  const days = rangeDays(14);
  const map = Object.fromEntries(days.map((k) => [k, 0]));
  for (const it of items || []) {
    const t = it?.[createdKey] || it?.createdAt || it?.date || null;
    if (!t) continue;
    const k = dayKey(t);
    if (k in map) map[k] += 1;
  }
  return days.map((k) => ({ date: k, [label]: map[k] }));
}

function numberFmt(n) {
  if (n == null) return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString();
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminFullName = `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim();

  const [docs, setDocs] = useState([]);
  const [hws, setHws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const docReqs = [];
        if (typeof DocumentApi?.listAdmin === "function") docReqs.push(DocumentApi.listAdmin({ per_page: 50 }));
        else if (typeof DocumentApi?.adminList === "function") docReqs.push(DocumentApi.adminList({ per_page: 50 }));
        else if (typeof DocumentApi?.listAll === "function") docReqs.push(DocumentApi.listAll({ per_page: 50 }));
        else if (typeof DocumentApi?.index === "function") docReqs.push(DocumentApi.index({ per_page: 50 }));

        const hwReqs = [];
        if (typeof HomeworkApi?.listAdmin === "function") hwReqs.push(HomeworkApi.listAdmin({ per_page: 50 }));
        else if (typeof HomeworkApi?.adminList === "function") hwReqs.push(HomeworkApi.adminList({ per_page: 50 }));
        else if (typeof HomeworkApi?.listAll === "function") hwReqs.push(HomeworkApi.listAll({ per_page: 50 }));
        else if (typeof HomeworkApi?.index === "function") hwReqs.push(HomeworkApi.index({ per_page: 50 }));

        const [dRes, hRes] = await Promise.all([
          docReqs.length ? docReqs[0] : Promise.resolve({}),
          hwReqs.length ? hwReqs[0] : Promise.resolve({}),
        ]);

        if (!mounted) return;
        setDocs(unwrap(dRes));
        setHws(unwrap(hRes));
      } catch (e) {
        // On laisse le dashboard s'afficher avec des valeurs par défaut
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const seriesDocs = useMemo(() => buildDailySeries(docs, "created_at", "Documents"), [docs]);
  const seriesHws = useMemo(() => buildDailySeries(hws, "created_at", "Devoirs"), [hws]);
  const seriesMerge = useMemo(() => {
    // fusionne Docs & Devoirs par date pour un bar chart comparatif
    const map = new Map();
    for (const row of seriesDocs) map.set(row.date, { date: row.date, Documents: row.Documents });
    for (const row of seriesHws) {
      const prev = map.get(row.date) || { date: row.date, Documents: 0 };
      map.set(row.date, { ...prev, Devoirs: row.Devoirs });
    }
    return Array.from(map.values()).map((r) => ({ Devoirs: 0, Documents: 0, ...r }));
  }, [seriesDocs, seriesHws]);

  const kpis = [
    {
      title: "Docs (aperçu)",
      value: numberFmt(docs?.length ?? 0),
      icon: <FileText className="h-4 w-4" />,
      to: "/admin/documents",
    },
    {
      title: "Devoirs (aperçu)",
      value: numberFmt(hws?.length ?? 0),
      icon: <ClipboardList className="h-4 w-4" />,
      to: "/admin/devoirs",
    },
    {
      title: "Notif. récentes",
      value: "—", // branche à ton endpoint notif si dispo
      icon: <Bell className="h-4 w-4" />,
      to: "/admin/notifications",
    },
    {
      title: "Sécurité",
      value: "OK",
      icon: <ShieldCheck className="h-4 w-4" />,
      to: "/admin/parametres",
    },
  ];

  return (
    <div className="relative">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl mb-6">
        <div className="relative h-[220px] sm:h-[260px] md:h-[300px] rounded-3xl">
          <SubjectBackground theme={ADMIN_THEME} clarity="bold" density="high" />
          <div className="relative z-10 h-full flex flex-col justify-center gap-3 p-6 md:p-10">
            <motion.h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Bonjour{adminFullName ? `, ${adminFullName}` : ""} 👋
            </motion.h1>

            <div className="flex items-center gap-3">
              <Badge className={`${ADMIN_THEME.chip} text-sm px-3 py-1`}>Espace administrateur</Badge>
              <span className="text-sm text-muted-foreground">Tableau de bord</span>
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Link to="/admin/manage-élèves">
                <Button size="sm" variant="secondary" className="gap-2">
                  <Users className="h-4 w-4" /> Gérer les étudiants
                </Button>
              </Link>
              <Link to="/admin/manage-enseignants">
                <Button size="sm" variant="outline" className="gap-2">
                  <Users className="h-4 w-4" /> Gérer les enseignants
                </Button>
              </Link>
              <Link to="/admin/manage-parents">
                <Button size="sm" variant="outline" className="gap-2">
                  <Users className="h-4 w-4" /> Gérer les parents
                </Button>
              </Link>
              
              <Link to="/admin/documents">
                <Button size="sm" className="gap-2">
                  <FilePlus2 className="h-4 w-4" /> Documents
                </Button>
              </Link>
              <Link to="/admin/devoirs">
                <Button size="sm" className="gap-2">
                  <ClipboardPlus className="h-4 w-4" /> Devoirs
                </Button>
              </Link>
              <Link to="/admin/paramètres">
                <Button size="sm" variant="outline" className="gap-2">
                  <Users className="h-4 w-4" /> Paramètres
                </Button>
              </Link>
              
            </div>
          </div>
        </div>
      </div>

      {/* GRID CONTENU */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* KPI Cards */}
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{k.title}</p>
                    <p className="text-2xl font-semibold mt-1">{k.value}</p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-muted/60 grid place-items-center">
                    {k.icon}
                  </div>
                </div>
                <div className="mt-3">
                  <Link to={k.to} className="text-xs underline">Ouvrir</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart 1: Activité documents (ligne) */}
        <Card className="xl:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <Header title="Documents (14 derniers jours)" icon={<LineChartIcon className="h-4 w-4" />} />
            <div className="p-4 h-[280px]">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesDocs} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Documents" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Docs vs Devoirs (barres) */}
        <Card className="xl:col-span-1 overflow-hidden">
          <CardContent className="p-0">
            <Header title="Docs vs Devoirs (14j)" icon={<ClipboardList className="h-4 w-4" />} />
            <div className="p-4 h-[280px]">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesMerge} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Documents" />
                    <Bar dataKey="Devoirs" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Listes récentes */}
        <Card className="xl:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <Header title="Derniers documents" icon={<FileText className="h-4 w-4" />} />
            <div className="p-4">
              {docs.length === 0 ? (
                <EmptyState text="Aucun document trouvé." action={<Link to="/admin/documents" className="underline text-sm">Gérer</Link>} />
              ) : (
                <ul className="space-y-3">
                  {docs.slice(0, 8).map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {d.subject_name ? `${d.subject_name} · ` : ""}Degré: {d.degree?.name ?? d.degree_id} · {d.teacher_name ?? d.owner_name ?? "—"}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <a className="text-xs underline" href={d.file_url} target="_blank" rel="noreferrer">Télécharger</a>
                          <Link to={`/admin/documents/${d.id}`} className="text-xs underline">Détails</Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 overflow-hidden">
          <CardContent className="p-0">
            <Header title="Derniers devoirs" icon={<ClipboardList className="h-4 w-4" />} />
            <div className="p-4">
              {hws.length === 0 ? (
                <EmptyState text="Aucun devoir trouvé." action={<Link to="/admin/devoirs" className="underline text-sm">Gérer</Link>} />
              ) : (
                <ul className="space-y-3">
                  {hws.slice(0, 8).map((d) => (
                    <li key={d.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {d.subject_name ? `${d.subject_name} · ` : ""}Degré: {d.degree?.name ?? d.degree_id}
                            {d.due_at ? ` · Échéance: ${new Date(d.due_at).toLocaleString()}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <a className="text-xs underline" href={d.file_url} target="_blank" rel="noreferrer">Télécharger</a>
                          <Link to={`/admin/devoirs/${d.id}`} className="text-xs underline">Détails</Link>
                        </div>
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
