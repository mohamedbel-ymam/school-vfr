import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";
import AttendanceApi from "../../../services/api/AttendanceApi.js";
import HomeworkApi from "../../../services/api/HomeworkApi.js";
import { toast } from "sonner";

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function Bac1SMDashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();

  // period selector + loading
  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(true);

  // attendance (current period)
  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null });

  // attendance (year/global)
  const [yearAtt, setYearAtt] = useState(null); // { a, j, p, rate }

  // fetch current period attendance
  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await AttendanceApi.me({ period });
      const a = clamp(res?.attendance?.absences ?? 0);
      const j = clamp(res?.attendance?.justified_absences ?? 0);
      const p = clamp(res?.attendance?.presences ?? 0);
      setAtt({
        a, j, p,
        rate: rateFrom(a, j, p),
        range: res?.period?.range ?? null,
      });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger vos présences (période).");
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

  // fetch global/year attendance (once)
  const fetchYear = async () => {
    try {
      const res = await AttendanceApi.me({ period: "overall" });
      const a = clamp(res?.attendance?.absences ?? 0);
      const j = clamp(res?.attendance?.justified_absences ?? 0);
      const p = clamp(res?.attendance?.presences ?? 0);
      setYearAtt({ a, j, p, rate: rateFrom(a, j, p) });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger vos présences (année).");
      setYearAtt(null);
    }
  };

  useEffect(() => { fetchYear(); }, []);
  useEffect(() => { fetchMe(); /* eslint-disable-next-line */ }, [period]);

  // optional extra cards
  const stats = useMemo(() => ([
    { title: "Séances du jour", value: 4 },
    { title: "Présences (période)", value: att.p },
    { title: "Nouveaux messages", value: 2 },
  ]), [att.p]);

  const shortcuts = [
    { label: "Ressources (SM)", onClick: () => nav("/élève/documents") },
    { label: "Examens",         onClick: () => nav("/élève/exams") },
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];
  const [homeworks, setHomeworks] = useState([]);

// fetch once (or when degree changes)
useEffect(() => {
  (async () => {
    try {
      const res = await HomeworkApi.listStudent({ per_page: 12 });
      const items = res?.data?.data?.data ?? res?.data?.data ?? [];
      setHomeworks(items);
    } catch {
      setHomeworks([]);
    }
  })();
}, []);

  return (
    <DashboardScaffold
      title="1ère année Bac (SM) — Tableau de bord"
      stats={stats}
  shortcuts={shortcuts}
  attendance={att}            // att may include {streak}
  attendanceYear={yearAtt}
  attendanceLoading={loading}
  period={period}
  onPeriodChange={setPeriod}
  homeworks={homeworks} 
    />
  );
}
