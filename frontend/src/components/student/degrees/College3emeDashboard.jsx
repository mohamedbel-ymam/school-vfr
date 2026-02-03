import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardScaffold from "../DashboardScaffold.jsx";
import { studentAttendanceApi } from "../../../services/api/AttendanceApi";
import HomeworkApi from "../../../services/api/HomeworkApi.js";
import { axiosClient } from "../../../api/axios";

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

export default function College3emeDashboard() {
  const nav = useNavigate();

  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(false);

  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null, streak: 0 });
  const [yearAtt, setYearAtt] = useState({ a: 0, j: 0, p: 0, rate: 0 });

  // ✅ keep your grade/rating system untouched
  const [term] = useState("S1");
  const [gradesSummary, setGradesSummary] = useState(null);
  const [disciplineSummary, setDisciplineSummary] = useState(null);

  // ---------------- Attendance (SAFE until student endpoint exists) ----------------
  const fetchMeSafe = async () => {
    setLoading(true);
    try {
      // Currently student endpoints not implemented -> this will throw (by design)
      // When you implement later: replace with a real method and map response.
      await studentAttendanceApi.myMonthly?.();

      // Example mapping later:
      // const res = await studentAttendanceApi.me({ period });
      // const a = clamp(res?.attendance?.absences ?? 0);
      // const j = clamp(res?.attendance?.justified_absences ?? 0);
      // const p = clamp(res?.attendance?.presences ?? 0);
      // setAtt({ a, j, p, rate: rateFrom(a, j, p), range: res?.period?.range ?? null, streak: res?.attendance?.streak ?? 0 });
    } catch {
      // keep 0 but don't crash / don't toast spam
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null, streak: 0 });
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

  // ---------------- Grades summary (KEEP AS IS) ----------------
  const fetchGradesSummary = async () => {
    try {
      const res = await axiosClient.get("/eleve/grades", { params: { term } });
      const summary = res?.data?.summary;

      setGradesSummary({
        avg_percent: summary?.avg_percent ?? null,
        count: summary?.count ?? 0,
        termLabel: term,
        updated_at: new Date().toLocaleDateString("fr-FR"),
      });
    } catch (e) {
      console.error(e);
      setGradesSummary(null);
    }
  };

  // ---------------- Discipline summary (KEEP AS IS) ----------------
  const fetchDisciplineSummary = async () => {
    try {
      const res = await axiosClient.get("/eleve/ratings", { params: { term, per_page: 50 } });
      const rows = res?.data?.data?.data ?? res?.data?.data ?? [];
      const latest = Array.isArray(rows) && rows.length ? rows[0] : null;

      setDisciplineSummary(
        latest
          ? {
              avg_stars: latest.avg_all_stars ?? latest.avg_stars ?? null,
              teacher_count: latest.teacher_count ?? 0,
              admin_count: latest.admin_count ?? 0,
              termLabel: term,
              periodLabel: latest.period ?? "Ce mois",
            }
          : {
              avg_stars: null,
              teacher_count: 0,
              admin_count: 0,
              termLabel: term,
              periodLabel: "—",
            }
      );
    } catch (e) {
      console.error(e);
      setDisciplineSummary(null);
    }
  };

  useEffect(() => {
    fetchGradesSummary();
    fetchDisciplineSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- UI ----------------
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
    { label: "Mes notes", onClick: () => nav("/élève/notes") },
    { label: "Discipline ⭐", onClick: () => nav("/élève/discipline") },
    { label: "Emploi du temps", onClick: () => nav("/élève/emploi du temps") },
  ];

  const [homeworks, setHomeworks] = useState([]);
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
      title="3ème année collège — Tableau de bord"
      stats={stats}
      shortcuts={shortcuts}
      attendance={att}
      attendanceYear={yearAtt}
      attendanceLoading={loading}
      period={period}
      onPeriodChange={setPeriod}
      homeworks={homeworks}
      gradesSummary={gradesSummary}
      disciplineSummary={disciplineSummary}
    />
  );
}
