// src/components/Student/Dashboards/Bac2Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import DashboardScaffold from "../DashboardScaffold.jsx";
import AttendanceApi from "../../../services/api/AttendanceApi.js";
import { toast } from "sonner";

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function Bac2Dashboard() {
  const { setSelectedDegree } = useAuth();
  const nav = useNavigate();

  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(true);
  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null });
  const [yearAtt, setYearAtt] = useState(null); // { a, j, p, rate }

  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await AttendanceApi.me({ period });
      const a = clamp(res?.attendance?.absences ?? 0);
      const j = clamp(res?.attendance?.justified_absences ?? 0);
      const p = clamp(res?.attendance?.presences ?? 0);
      setAtt({ a, j, p, rate: rateFrom(a, j, p), range: res?.period?.range ?? null });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger vos présences (période).");
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

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

  const stats = useMemo(() => ([
    { title: "Séances du jour", value: 6 },
    { title: "Présences (période)", value: att.p },
    { title: "Messages non lus", value: 2 },
  ]), [att.p]);

  const shortcuts = [
    { label: "Ressources (SM)", onClick: () => nav("/élève/documents") },
    { label: "Examens",         onClick: () => nav("/élève/exams") },
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];

  return (
    <DashboardScaffold
      title="2ème année Bac — Tableau de bord"
      images={["./images/bac1-se/1.jpg","./images/bac1-se/2.jpg","./images/bac1-se/3.jpg"]}
      stats={stats}
      shortcuts={shortcuts}
      onBack={() => { setSelectedDegree?.(null); nav("/élève/select-degree"); }}

      attendance={att}
      attendanceYear={yearAtt}
      attendanceLoading={loading}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}
