import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  ShieldCheck,
  LineChart as LineChartIcon,
  Bell,
  UserX,
  AlertTriangle,
  Activity,
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
  Cell,
} from "recharts";

// APIs
import DocumentApi from "../../../services/api/DocumentApi";
import HomeworkApi from "../../../services/api/HomeworkApi";
import AttendanceApi from "../../../services/api/AttendanceApi";
import { axiosClient } from "../../../api/axios";

import { useAuth } from "../../../context/AuthContext";

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */
const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? [];

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const numberFmt = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString();

/* -------------------------------------------------------------------------- */
/* Attendance helpers                                                         */
/* -------------------------------------------------------------------------- */
function riskStatus(abs, just) {
  const a = +abs || 0;
  const j = +just || 0;
  const total = a + j;
  if (a >= 3 || total >= 5)
    return { label: "Danger", className: "bg-red-100 text-red-700 border-red-200" };
  if (a >= 1 || total >= 3)
    return { label: "Attention", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "OK", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

/* -------------------------------------------------------------------------- */
/* Degree colors (charts only)                                                */
/* -------------------------------------------------------------------------- */
const DEGREE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#f59e0b",
  "#9333ea",
  "#ef4444",
  "#0ea5e9",
  "#84cc16",
];
const colorForDegree = (id) =>
  DEGREE_COLORS[Math.abs(Number(id)) % DEGREE_COLORS.length];

/* -------------------------------------------------------------------------- */
/* Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */
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
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
/* ---------------- Chart helpers ---------------- */
function rangeDays(n = 14) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function buildDailySeries(items, createdKey = "created_at", label = "Valeur") {
  const days = rangeDays(14);
  const map = Object.fromEntries(days.map((k) => [k, 0]));

  for (const it of items || []) {
    const t = it?.[createdKey] || it?.createdAt || it?.date;
    if (!t) continue;
    const k = new Date(t).toISOString().slice(0, 10);
    if (k in map) map[k] += 1;
  }

  return days.map((k) => ({ date: k, [label]: map[k] }));
}


/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function AdminDashboard() {

  const { user } = useAuth();
  const adminFullName = `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim();

  const [docs, setDocs] = useState([]);
  const [hws, setHws] = useState([]);
  const [loading, setLoading] = useState(true);

  const [attPeriod, setAttPeriod] = useState("month");
  const [att, setAtt] = useState({
    totals: { absences: 0, justified_absences: 0, presences: 0, attendance_rate: 0 },
    top: [],
  });
  const [attLoading, setAttLoading] = useState(true);

  const [degrees, setDegrees] = useState([]);
  const [degFilter, setDegFilter] = useState("all");
  const [degTotals, setDegTotals] = useState([]);
  const [degStudents, setDegStudents] = useState([]);
  const [degLoading, setDegLoading] = useState(false);

  /* ---------------- Load documents & devoirs ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dRes, hRes] = await Promise.all([
          DocumentApi.listAdmin({ per_page: 50 }),
          HomeworkApi.listAdmin({ per_page: 50 }),
        ]);
        if (!alive) return;
        setDocs(unwrap(dRes));
        setHws(unwrap(hRes));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  /* ---------------- Attendance summary ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setAttLoading(true);
      try {
        const data = await AttendanceApi.summary({ period: attPeriod });
        if (!alive) return;
        setAtt({
          totals: data?.totals ?? att.totals,
          top: data?.top ?? [],
        });
      } finally {
        if (alive) setAttLoading(false);
      }
    })();
    return () => (alive = false);
  }, [attPeriod]);

  /* ---------------- Degrees ---------------- */
  useEffect(() => {
    (async () => {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 500 } });
      const list = res?.data?.data ?? [];
      setDegrees(list.map((d) => ({ id: d.id, name: d.name })));
    })();
  }, []);

  /* ---------------- Degree-aware attendance ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setDegLoading(true);
      try {
        if (degFilter === "all") {
          const rows = await Promise.all(
            degrees.slice(0, 8).map(async (d) => {
              const res = await AttendanceApi.list({
                degree_id: d.id,
                per_page: 1000,
                period: attPeriod,
              });
              const items = res?.items ?? [];
              const agg = items.reduce(
                (a, r) => {
                  a.absences += r?.attendance?.absences || 0;
                  a.justified += r?.attendance?.justified_absences || 0;
                  a.presences += r?.attendance?.presences || 0;
                  return a;
                },
                { absences: 0, justified: 0, presences: 0 }
              );
              return { id: d.id, name: d.name, ...agg };
            })
          );
          if (alive) {
            setDegTotals(rows);
            setDegStudents([]);
          }
        } else {
          const res = await AttendanceApi.list({
            degree_id: degFilter,
            per_page: 1000,
            period: attPeriod,
          });
          const rows = (res?.items ?? []).map((r) => ({
            id: r.id,
            name: `${r.firstname} ${r.lastname}`,
            absences: r?.attendance?.absences || 0,
            justified: r?.attendance?.justified_absences || 0,
            presences: r?.attendance?.presences || 0,
          }));
          rows.sort((a, b) => b.absences + b.justified - (a.absences + a.justified));
          if (alive) {
            setDegStudents(rows);
            setDegTotals([]);
          }
        }
      } finally {
        if (alive) setDegLoading(false);
      }
    })();
    return () => (alive = false);
  }, [degFilter, attPeriod, degrees]);
  const kpis = [
  {
    title: "Documents",
    value: numberFmt(docs.length),
    icon: <FileText className="h-4 w-4" />,
    to: "/admin/documents",
  },
  {
    title: "Devoirs",
    value: numberFmt(hws.length),
    icon: <ClipboardList className="h-4 w-4" />,
    to: "/admin/devoirs",
  },
  {
    title: "Notifications",
    value: "—",
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

/* ---------------- Attendance KPI cards ---------------- */
const attCards = [
  {
    title: "Absences non justifiées",
    value: numberFmt(att.totals.absences),
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    title: "Absences justifiées",
    value: numberFmt(att.totals.justified_absences),
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Présences",
    value: numberFmt(att.totals.presences),
    icon: <Activity className="h-4 w-4" />,
  },
  {
    title: "Taux de présence",
    value: `${numberFmt(att.totals.attendance_rate)}%`,
    icon: <LineChartIcon className="h-4 w-4" />,
  },
];

/* ---------------- Charts data ---------------- */
const seriesDocs = useMemo(
  () => buildDailySeries(docs, "created_at", "Documents"),
  [docs]
);

const seriesHws = useMemo(
  () => buildDailySeries(hws, "created_at", "Devoirs"),
  [hws]
);

const seriesMerge = useMemo(() => {
  const map = new Map();

  for (const r of seriesDocs) {
    map.set(r.date, { date: r.date, Documents: r.Documents, Devoirs: 0 });
  }
  for (const r of seriesHws) {
    const prev = map.get(r.date) || { date: r.date, Documents: 0 };
    map.set(r.date, { ...prev, Devoirs: r.Devoirs });
  }

  return Array.from(map.values());
}, [seriesDocs, seriesHws]);

  /* -------------------------------------------------------------------------- */
  /* UI                                                                        */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Bonjour{adminFullName && `, ${adminFullName}`}
            </h1>
            <p className="text-sm text-slate-600">Tableau de bord administrateur</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
            ADMIN
          </Badge>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin/manage-élèves"><Button size="sm" variant="secondary"><Users className="h-4 w-4 mr-1" />Étudiants</Button></Link>
          <Link to="/admin/manage-enseignants"><Button size="sm" variant="outline">Enseignants</Button></Link>
          <Link to="/admin/manage-parents"><Button size="sm" variant="outline">Parents</Button></Link>
          <Link to="/admin/documents"><Button size="sm"><FilePlus2 className="h-4 w-4 mr-1" />Documents</Button></Link>
          <Link to="/admin/devoirs"><Button size="sm"><ClipboardPlus className="h-4 w-4 mr-1" />Devoirs</Button></Link>
          <Link to="/admin/presences"><Button size="sm" variant="outline"><UserX className="h-4 w-4 mr-1" />Présences</Button></Link>
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

        {/* Attendance block (period + degree aware) */}
        <Card className="xl:col-span-3 overflow-hidden">
          <CardContent className="p-0">
            <Header title="Présence & Absences" icon={<UserX className="h-4 w-4" />} />
            <div className="px-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Période:</span>
                    <select
                      value={attPeriod}
                      onChange={(e) => setAttPeriod(e.target.value)}
                      className="h-8 rounded-md border px-2 text-sm"
                    >
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="overall">Global</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Classe:</span>
                    <select
                      value={String(degFilter)}
                      onChange={(e) => setDegFilter(e.target.value)}
                      className="h-8 rounded-md border px-2 text-sm min-w-[160px]"
                    >
                      <option value="all">Toutes les classes</option>
                      {degrees.slice(0, 20).map((d) => (
                        <option key={d.id} value={String(d.id)}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Link to="/admin/presences" className="text-sm underline">Ouvrir la gestion des présences</Link>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {attCards.map((c, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{c.title}</p>
                          <p className="text-2xl font-semibold mt-1">{attLoading ? "…" : c.value}</p>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-muted/60 grid place-items-center">
                          {c.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Degree-aware charts */}
              <div className="mt-4 h-[320px]">
                {(attLoading || degLoading) ? (
                  <div className="text-sm text-muted-foreground p-4">Chargement…</div>
                ) : degFilter === "all" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={degTotals.map((d) => ({
                        id: d.id,
                        name: d.name,
                        Absences: d.absences,
                        Justifiées: d.justified,
                        Présences: d.presences,
                      }))}
                      margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Absences" fill="#ef4444" />
                      <Bar dataKey="Justifiées" fill="#f59e0b" />
                      <Bar dataKey="Présences">
                        {degTotals.map((entry, index) => (
                          <Cell key={`cell-pres-${index}`} fill={colorForDegree(entry.id)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={degStudents.map((s) => ({
                        name: s.name,
                        Absences: s.absences,
                        Justifiées: s.justified,
                        Présences: s.presences,
                      }))}
                      margin={{ top: 10, right: 20, bottom: 40, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Absences" fill="#ef4444" />
                      <Bar dataKey="Justifiées" fill="#f59e0b" />
                      <Bar dataKey="Présences" fill={colorForDegree(degFilter)} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top at-risk list */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Élèves à risque (top)</h4>
                {attLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement…</div>
                ) : att.top.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun signalement pour la période.</div>
                ) : (
                  <ul className="space-y-2">
                    {att.top.map((t) => {
                      const rs = riskStatus(t.absences, t.justified_absences);
                      const initials = ((t.student.firstname?.[0] ?? "?") + (t.student.lastname?.[0] ?? "")).toUpperCase();
                      return (
                        <li key={t.student.id} className="flex items-center justify-between rounded-lg border p-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 grid place-content-center text-xs font-semibold">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {t.student.firstname} {t.student.lastname}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Abs: {t.absences} (just.: {t.justified_absences}) · Prés: {t.presences}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded border ${rs.className}`}>{rs.label}</span>
                            <Link
                              to={`/admin/presences?q=${encodeURIComponent(t.student.lastname ?? "")}`}
                              className="text-xs underline"
                            >
                              Revoir
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
