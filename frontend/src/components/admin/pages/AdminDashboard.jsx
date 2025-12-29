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
  const days = rangeDays(14);
  const map = Object.fromEntries(days.map((k) => [k, 0]));
  for (const it of items || []) {
    const t = it?.[createdKey] || it?.createdAt || it?.date;
    if (!t) continue;
    const k = dayKey(t);
    if (k in map) map[k] += 1;
  }
  return days.map((k) => ({ date: k, [label]: map[k] }));
}
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
/* Degree color palette (charts only)                                         */
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
const colorForDegree = (id) => {
  if (id == null) return "#64748b";
  return DEGREE_COLORS[Math.abs(Number(id)) % DEGREE_COLORS.length];
};

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

  /* ---------------------------- Load docs / hws ---------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dRes, hRes] = await Promise.all([
          DocumentApi.listAdmin?.({ per_page: 50 }) ?? {},
          HomeworkApi.listAdmin?.({ per_page: 50 }) ?? {},
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

  /* ------------------------ Attendance global summary ----------------------- */
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

  /* ------------------------------ Load degrees ------------------------------ */
  useEffect(() => {
    (async () => {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 500 } });
      const list = res?.data?.data ?? res?.data ?? [];
      setDegrees(list.map((d) => ({ id: d.id, name: d.name })));
    })();
  }, []);

  /* ---------------------- Degree-aware attendance data ---------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setDegLoading(true);
      try {
        if (degFilter === "all") {
          const sample = degrees.slice(0, 8);
          const rows = await Promise.all(
            sample.map(async (d) => {
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

  const seriesDocs = useMemo(
    () => buildDailySeries(docs, "created_at", "Documents"),
    [docs]
  );
  const seriesHws = useMemo(
    () => buildDailySeries(hws, "created_at", "Devoirs"),
    [hws]
  );

  /* -------------------------------------------------------------------------- */
  /* UI                                                                        */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Documents", value: docs.length, icon: <FileText className="h-4 w-4" />, to: "/admin/documents" },
          { title: "Devoirs", value: hws.length, icon: <ClipboardList className="h-4 w-4" />, to: "/admin/devoirs" },
          { title: "Notifications", value: "—", icon: <Bell className="h-4 w-4" />, to: "/admin/notifications" },
          { title: "Sécurité", value: "OK", icon: <ShieldCheck className="h-4 w-4" />, to: "/admin/parametres" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.title}</p>
                <p className="text-2xl font-semibold">{numberFmt(k.value)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center">
                {k.icon}
              </div>
            </CardContent>
            <div className="px-4 pb-3">
              <Link to={k.to} className="text-xs underline">Ouvrir</Link>
            </div>
          </Card>
        ))}
      </div>

      {/* ATTENDANCE */}
      <Card>
        <CardContent className="p-0">
          <Header title="Présence & absences" icon={<UserX className="h-4 w-4" />} />
          <div className="p-4 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={attPeriod}
                onChange={(e) => setAttPeriod(e.target.value)}
                className="h-8 rounded-md border px-2 text-sm"
              >
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
                <option value="overall">Global</option>
              </select>

              <select
                value={degFilter}
                onChange={(e) => setDegFilter(e.target.value)}
                className="h-8 rounded-md border px-2 text-sm min-w-[160px]"
              >
                <option value="all">Toutes les classes</option>
                {degrees.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <Link to="/admin/presences" className="text-sm underline ml-auto">
                Gérer les présences
              </Link>
            </div>

            {/* Charts */}
            <div className="h-[320px]">
              {(attLoading || degLoading) ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : degFilter === "all" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={degTotals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="absences" fill="#ef4444" name="Absences" />
                    <Bar dataKey="justified" fill="#f59e0b" name="Justifiées" />
                    <Bar dataKey="presences" name="Présences">
                      {degTotals.map((d, i) => (
                        <Cell key={i} fill={colorForDegree(d.id)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={degStudents}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="absences" fill="#ef4444" name="Absences" />
                    <Bar dataKey="justified" fill="#f59e0b" name="Justifiées" />
                    <Bar dataKey="presences" fill={colorForDegree(degFilter)} name="Présences" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
