// src/components/Student/Dashboards/College3emeDashboard.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "./_parts/DashboardScaffold.jsx";
import AttendanceApi from "../../../services/api/AttendanceApi.js";
import { toast } from "sonner";

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function College3emeDashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();

  // period selector + loading
  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(true);

  // attendance data
  const [att, setAtt] = useState({
    a: 0, j: 0, p: 0, rate: 0, range: null,
  });

  // fetch student's own attendance for selected period
  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await AttendanceApi.me({ period });
      const a = clamp(res?.attendance?.absences ?? 0);
      const j = clamp(res?.attendance?.justified_absences ?? 0);
      const p = clamp(res?.attendance?.presences ?? 0);
      setAtt({
        a,
        j,
        p,
        rate: rateFrom(a, j, p),
        range: res?.period?.range ?? null,
      });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger vos présences.");
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // optional extra stat cards (you can replace with real data later)
  const stats = useMemo(() => ([
    { title: "Séances du jour", value: 3 },
    { title: "Présences (période)", value: att.p },
    { title: "Nouveaux messages", value: 1 },
  ]), [att.p]);

  const shortcuts = [
    { label: "Ressources (SM)", onClick: () => nav("/élève/documents") },
    { label: "Examens",         onClick: () => nav("/élève/exams") },
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];

  return (
    <DashboardScaffold
      title="3ème année collège — Tableau de bord"
      images={[]}           // you’ll plug your carousel images later
      stats={stats}         // optional extras
      shortcuts={shortcuts}
      onBack={() => { setSelectedDegree?.(null); nav("/élève/select-degree"); }}

      // attendance block
      attendance={att}              // { a, j, p, rate, range }
      attendanceLoading={loading}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}
