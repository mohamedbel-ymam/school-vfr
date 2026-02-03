import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";
import { studentAttendanceApi } from "../../../services/api/AttendanceApi";
import HomeworkApi from "../../../services/api/HomeworkApi.js";

const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function Bac2Gr2Dashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();

  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(false);

  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null });
  const [yearAtt, setYearAtt] = useState({ a: 0, j: 0, p: 0, rate: 0 });
  const [homeworks, setHomeworks] = useState([]);

  // ✅ safe attendance fetch (won't break deploy if student endpoints not ready yet)
  const fetchMeSafe = async () => {
    setLoading(true);
    try {
      // until backend exists
      await studentAttendanceApi.myMonthly?.();

      // Later (when implemented):
      // const res = await studentAttendanceApi.me({ period });
      // const a = clamp(res?.attendance?.absences ?? 0);
      // const j = clamp(res?.attendance?.justified_absences ?? 0);
      // const p = clamp(res?.attendance?.presences ?? 0);
      // setAtt({ a, j, p, rate: rateFrom(a, j, p), range: res?.period?.range ?? null });
    } catch {
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchYearSafe = async () => {
    try {
      // Later: call overall endpoint
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

  const stats = useMemo(
    () => [
      { title: "Séances du jour", value: 2 },
      { title: "Présences (période)", value: att.p },
      { title: "Messages non lus", value: 0 },
    ],
    [att.p]
  );

  const shortcuts = [
    { label: "Ressources (SM)", onClick: () => nav("/élève/documents") },
    { label: "Examens", onClick: () => nav("/élève/tests") }, // ✅ correct route
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];

  return (
    <DashboardScaffold
      title="2ème année Bac — Groupe 2"
      stats={stats}
      shortcuts={shortcuts}
      onBack={() => {
        setSelectedDegree?.(null);
        nav("/élève/select-degree");
      }}
      attendance={att}
      attendanceYear={yearAtt}
      attendanceLoading={loading}
      period={period}
      onPeriodChange={setPeriod}
      homeworks={homeworks}
    />
  );
}
