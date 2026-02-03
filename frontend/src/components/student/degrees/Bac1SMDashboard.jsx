import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardScaffold from "../DashboardScaffold.jsx";
import { studentAttendanceApi } from "../../../services/api/AttendanceApi.js";
import HomeworkApi from "../../../services/api/HomeworkApi.js";
// import { toast } from "sonner"; // optional (avoid spam until backend exists)

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function Bac1SMDashboard() {
  const nav = useNavigate();

  // period selector + loading
  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(false);

  // attendance (current period)
  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null });

  // attendance (year/global)
  const [yearAtt, setYearAtt] = useState({ a: 0, j: 0, p: 0, rate: 0 });

  // ✅ build-safe attendance fetch (backend not implemented yet)
  const fetchMeSafe = async () => {
    setLoading(true);
    try {
      // When you implement student attendance endpoints, replace this call accordingly.
      await studentAttendanceApi.myMonthly?.();

      // Example mapping later (when you have real response):
      // const res = await studentAttendanceApi.me({ period });
      // const a = clamp(res?.attendance?.absences ?? 0);
      // const j = clamp(res?.attendance?.justified_absences ?? 0);
      // const p = clamp(res?.attendance?.presences ?? 0);
      // setAtt({ a, j, p, rate: rateFrom(a, j, p), range: res?.period?.range ?? null });
    } catch (e) {
      // don't toast-spam until the endpoint exists
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchYearSafe = async () => {
    try {
      // same: until backend exists keep 0s
      // later: call overall endpoint
      setYearAtt({ a: 0, j: 0, p: 0, rate: 0 });
    } catch {
      setYearAtt({ a: 0, j: 0, p: 0, rate: 0 });
    }
  };

  useEffect(() => {
    fetchYearSafe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMeSafe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // optional extra cards
  const stats = useMemo(
    () => [
      { title: "Séances du jour", value: 1 },
      { title: "Présences (période)", value: att.p },
      { title: "Nouveaux messages", value: 0 },
    ],
    [att.p]
  );

  const shortcuts = [
    { label: "Ressources (SM)", onClick: () => nav("/élève/documents") },
    { label: "Examens", onClick: () => nav("/élève/tests") }, // ✅ correct route
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];

  const [homeworks, setHomeworks] = useState([]);

  // fetch once
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
      attendance={att}
      attendanceYear={yearAtt}
      attendanceLoading={loading}
      period={period}
      onPeriodChange={setPeriod}
      homeworks={homeworks}
    />
  );
}
