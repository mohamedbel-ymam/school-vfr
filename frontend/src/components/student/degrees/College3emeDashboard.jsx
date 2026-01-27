import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardScaffold from "../DashboardScaffold.jsx";
import AttendanceApi from "../../../services/api/AttendanceApi.js";
import HomeworkApi from "../../../services/api/HomeworkApi.js";
import { toast } from "sonner";
import { axiosClient } from "../../../api/axios";

// helpers
const clamp = (n) => (Number.isFinite(+n) ? Math.max(0, +n) : 0);
const rateFrom = (a, j, p) => {
  const A = clamp(a), J = clamp(j), P = clamp(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
};

// compute grade summary from grade rows (no need backend change)
function computeGradesSummary(rows = []) {
  let sumScore = 0;
  let sumMax = 0;

  for (const g of rows) {
    const s = Number(g?.score);
    const m = Number(g?.max_score);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) continue;
    sumScore += s;
    sumMax += m;
  }

  const avg_percent = sumMax > 0 ? (sumScore / sumMax) * 100 : null;

  return {
    avg_percent,
    count: Array.isArray(rows) ? rows.length : 0,
  };
}

export default function College3emeDashboard() {
  const nav = useNavigate();

  const [period, setPeriod] = useState("month"); // 'overall' | 'month' | 'week'
  const [loading, setLoading] = useState(true);
  const [att, setAtt] = useState({ a: 0, j: 0, p: 0, rate: 0, range: null });
  const [yearAtt, setYearAtt] = useState(null);

  // ✅ new dashboard data
  const [term] = useState("S1"); // keep simple for now
  const [gradesSummary, setGradesSummary] = useState(null);
  const [disciplineSummary, setDisciplineSummary] = useState(null);

  // fetch current period attendance
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
        streak: res?.attendance?.streak ?? 0,
      });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger vos présences (période).");
      setAtt({ a: 0, j: 0, p: 0, rate: 0, range: null });
    } finally {
      setLoading(false);
    }
  };

  // fetch full year attendance once
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

  // ✅ fetch grade summary (student)
  const fetchGradesSummary = async () => {
    try {
      // change if your endpoint differs:
    const res = await axiosClient.get("/eleve/grades", { params: { term } });
    const summary = res?.data?.summary;

    setGradesSummary({
    avg_percent: summary?.avg_percent ?? null,
    count: summary?.count ?? 0,
    termLabel: term,
    updated_at: new Date().toLocaleDateString(),
  });
    } catch (e) {
      console.error(e);
      setGradesSummary(null);
    }
  };

  // ✅ fetch discipline summary (aggregated)
  const fetchDisciplineSummary = async () => {
    try {
      // change if your endpoint differs:
      const res = await axiosClient.get("/eleve/ratings", { params: { term, per_page: 50 } });
      const rows = res?.data?.data?.data ?? res?.data?.data ?? [];
      // take latest row (backend should latest())
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
    fetchYear();
  }, []);

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // ✅ load summaries once for test
  useEffect(() => {
    fetchGradesSummary();
    fetchDisciplineSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // ✅ new props
      gradesSummary={gradesSummary}
      disciplineSummary={disciplineSummary}
    />
  );
}
