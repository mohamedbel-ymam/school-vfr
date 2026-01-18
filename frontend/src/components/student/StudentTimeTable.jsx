// src/components/student/StudentTimeTable.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../api/axios";
import subjectColors from "../../config/subjectColors";

/* ───────────────────────────── Text helpers ───────────────────────────── */
const _strip = (s = "") => s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slugify = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ───────────────────────────── Abbreviations ───────────────────────────── */
const SUBJECT_ABBR = {
  "physique & chimie": "PC",
  "physique et chimie": "PC",
  "physique-chimie": "PC",
  "français": "FR",
  "francais": "FR",
  "mathématiques": "MA",
  "mathematiques": "MA",
  maths: "MA",
  anglais: "AN",
  arabe: "AR",
  svt: "SVT",
  "histoire géographie": "HG",
  "histoire-geographie": "HG",
  "histoire-géographie": "HG",
  informatique: "INFO",
  "éducation physique": "EPS",
  "education physique": "EPS",
  philosophie: "PHI",
};
const subjectAbbr = (name = "") => {
  const n = _strip(name);
  if (SUBJECT_ABBR[n]) return SUBJECT_ABBR[n];
  const letters = n
    .split(/\s+/)
    .filter((w) => w && !["de", "du", "et", "la", "le", "les"].includes(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return letters || name.slice(0, 4).toUpperCase();
};

/* ───────────────────────────── UI bits ───────────────────────────── */
function BackToThisWeekFab({ show, onClick }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 px-3 py-2 rounded-full shadow-lg border bg-background/95 hover:bg-muted transition"
      aria-label="Revenir à cette semaine"
    >
      Cette semaine
    </button>
  );
}

/* ───────────────────────────── Constants ───────────────────────────── */
const DAYS = [
  { label: "Lun", full: "Lundi", val: 1 },
  { label: "Mar", full: "Mardi", val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi", val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi", val: 6 },
  { label: "Dim", full: "Dimanche", val: 7 },
];
const HARD_MIN = 7 * 60;
const HARD_MAX = 22 * 60;
const PAD_MINS = 30;
const SCHOOL_START_MINS = 9 * 60;
const PERIOD_DURATION_MINS = 90;

/* ───────────────────────────── Utilities ───────────────────────────── */
const unwrapLessons = (r) =>
  r?.data?.data?.lessons ??
  r?.data?.lessons ??
  (Array.isArray(r?.data?.data) ? r.data.data : r?.data ?? []);

const unwrapPlans = (r) => r?.data?.data ?? r?.data ?? [];

const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const normalizeDow = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 7;
  if (n < 0) return null;
  if (n > 7) return (n % 7) || 7;
  return n;
};
const parseTimeLike = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return `${pad2(+m[1])}:${pad2(+m[2])}`;
  m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (m) return `${pad2(+m[1])}:${pad2(+(m[2] ?? 0))}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${pad2(+m[1])}:${pad2(+m[2])}`;
  m = s.match(/^(\d{1,2})$/);
  if (m) return `${pad2(+m[1])}:00`;
  return null;
};
const toMins = (hhmm) => {
  const s = parseTimeLike(hhmm);
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay();
  const delta = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const sameMonday = (a, b) => startOfWeekMonday(a).getTime() === startOfWeekMonday(b).getTime();
const isSameDayIndex = (date, dow1to7) => {
  const js = date.getDay();
  const ours = js === 0 ? 7 : js;
  return ours === dow1to7;
};
const inWeek = (date, monday) => {
  const start = new Date(monday);
  const end = addDays(monday, 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
};

const subjectKey = (l) =>
  l?.subject?.key ??
  l?.subject?.id ??
  l?.subject_id ??
  slugify(l?.subject?.name ?? l?.subject_name ?? "subject");

const hashInt = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};
const hueForSubject = (key) => (hashInt(String(key)) * 137.508) % 360;

const subjectSolidColor = (l) => {
  const key = String(subjectKey(l));
  if (subjectColors[key]) return subjectColors[key];
  return `hsl(${hueForSubject(key)} 65% 45%)`;
};
const subjectSoftBgFromKey = (key) => `hsl(${hueForSubject(key)} 65% 45% / 0.14)`;

const roomName = (l) => l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

const numOrNull = (v) => {
  if (v === 0 || v === "0") return 0;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pickFirst = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const getStartStr = (l) => pickFirst(l?.start, l?.start_time, l?.from, l?.hour_from, l?.begin, l?.time_from) ?? null;
const getEndStr = (l) => pickFirst(l?.end, l?.end_time, l?.to, l?.hour_to, l?.finish, l?.time_to) ?? null;

const getStartMin = (l) => numOrNull(l?.start_minutes) ?? toMins(getStartStr(l));
const getEndMin = (l) => numOrNull(l?.end_minutes) ?? toMins(getEndStr(l));

const parsePeriodToMins = (period) => {
  if (!period && period !== 0) return null;
  const s = String(period).trim();
  let m = s.match(/(\d{1,2}[:h.]\d{0,2})\s*[-–—àto]+\s*(\d{1,2}[:h.]\d{0,2})/i);
  if (m) {
    const sm = toMins(m[1]);
    const em = toMins(m[2]);
    if (sm != null && em != null && em > sm) return [sm, em];
  }
  m = s.match(/(\d{1,2})/);
  if (m) {
    const idx = Math.max(1, Math.min(20, parseInt(m[1], 10)));
    const start = SCHOOL_START_MINS + (idx - 1) * PERIOD_DURATION_MINS;
    return [start, start + PERIOD_DURATION_MINS];
  }
  return null;
};
const resolveStartEndMins = (row) => {
  const sm = getStartMin(row);
  const em = getEndMin(row);
  if (sm != null && em != null && em > sm) return [sm, em];
  const p = parsePeriodToMins(row?.period);
  if (p) return p;
  return null;
};

async function fetchStudentAllowedDegrees(authUser) {
  const ids = new Set();
  const names = new Set();

  if (!authUser) {
    return { ids, names };
  }

  const user =
    authUser.user ??
    authUser.student ??
    authUser;

  const one =
    asDegreeObj(user?.degree, user?.degree_id) ||
    asDegreeObj(user?.classe?.degree, user?.classe?.degree_id) ||
    asDegreeObj(user?.class?.degree, user?.class?.degree_id) ||
    asDegreeObj(user?.current_degree, user?.current_degree_id);

  if (one) {
    if (one.id != null) ids.add(String(one.id));
    if (one.name) names.add(_strip(one.name));
  }

  const arr =
    user?.degrees ??
    user?.allowed_degrees ??
    user?.classes ??
    [];

  if (Array.isArray(arr)) {
    for (const it of arr) {
      const d = asDegreeObj(it?.degree ?? it, it?.degree_id ?? it?.id);
      if (!d) continue;
      if (d.id != null) ids.add(String(d.id));
      if (d.name) names.add(_strip(d.name));
    }
  }

  return { ids, names };
}

/* ───────────────────────────── ICS helpers ───────────────────────────── */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`;
const buildIcs = (events) => {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takwa Etablissement//Élève Emploi du temps//EN"];
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(ev.start)}`,
      `DTEND:${toIcsDate(ev.end)}`,
      `SUMMARY:${ev.title}`,
      ev.location ? `LOCATION:${ev.location}` : "",
      ev.desc ? `DESCRIPTION:${ev.desc.replace(/\n/g, "\\n")}` : "",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
};

/* ───────────────────────────── API helpers ───────────────────────────── */
const STUDENT_ENDPOINT = "/eleve/emploi-du-temps";
const PLANS_ENDPOINT = "/eleve/monthly-plans";

const fetchStudentWeek = async ({ week_start }) => {
  if (TimeTableApi?.student) return TimeTableApi.student({ week_start });
  return axiosClient.get(STUDENT_ENDPOINT, { params: { week_start } });
};

/* Subject catalog (robust fallback when API returns only subject_id) */


function decorateSubjectFromRaw(l) {
  const name =
    l?.subject?.name ??
    l?.subject_name ??
    "Matière";

  const id =
    l?.subject?.id ??
    l?.subject_id ??
    slugify(name);

  return {
    id,
    name,
    key: id,
  };
}
/* ───────────────────── Degree extraction & guard ───────────────────── */
const firstTruthy = (...a) => a.find((v) => v !== undefined && v !== null && String(v).trim?.() !== "");

const asDegreeObj = (x, fallbackId) => {
  if (!x) return null;
  if (typeof x === "string") return { id: fallbackId ?? slugify(x), name: x };
  return {
    id: firstTruthy(x.id, fallbackId, x.value),
    name: firstTruthy(x.name, x.title, x.label, x.fullname, x.full_name),
  };
};

function lessonDegree(l) {
  // try nested
  const obj =
    asDegreeObj(l?.degree, l?.degree_id) ||
    asDegreeObj(l?.timetable?.degree, l?.timetable?.degree_id) ||
    asDegreeObj(l?.classe?.degree) ||
    asDegreeObj(l?.class?.degree) ||
    asDegreeObj(l?.classroom?.degree) ||
    asDegreeObj(l?.group?.degree) ||
    asDegreeObj(l?.section?.degree) ||
    asDegreeObj(l?.division?.degree) ||
    // flat aliases
    asDegreeObj(
      {
        name: firstTruthy(l?.degree_name, l?.niveau_name, l?.level_name, l?.class_name, l?.classe_name),
      },
      firstTruthy(l?.degree_id, l?.niveau_id, l?.level_id, l?.class_id, l?.classe_id)
    );
  if (obj) return { id: obj.id != null ? String(obj.id) : null, name: obj.name ?? null };
  if (l?.degree_id != null) return { id: String(l.degree_id), name: null };
  return { id: null, name: null };
}

function planDegree(p) {
  const obj =
    asDegreeObj(p?.degree, p?.degree_id) ||
    asDegreeObj(p?.timetable?.degree, p?.timetable?.degree_id) ||
    asDegreeObj(
      { name: firstTruthy(p?.degree_name, p?.niveau_name, p?.level_name) },
      firstTruthy(p?.degree_id, p?.niveau_id, p?.level_id)
    );
  if (obj) return { id: obj.id != null ? String(obj.id) : null, name: obj.name ?? null };
  if (p?.degree_id != null) return { id: String(p.degree_id), name: null };
  return { id: null, name: null };
}




// function keepByAllowed(lessonOrPlan, allowed) {
//   const { ids, names } = allowed;
//   const { id, name } = ("plan_date" in lessonOrPlan) ? planDegree(lessonOrPlan) : lessonDegree(lessonOrPlan);

//   if (ids.size) {
//     if (id != null) return ids.has(String(id));
//     // if ids are known but lesson has no id, reject to be safe
//     return false;
//   }
//   if (names.size) {
//     if (name) return names.has(_strip(name));
//     // if names are known but lesson has no name, reject to be safe
//     return false;
//   }
//   // no allowed info known → don't filter (fallback)
//   return true;
// }

function dominantDegreeFromLessons(lessons) {
  const map = new Map();

  for (const l of lessons ?? []) {
    const id =
      l?.degree_id ??
      l?.degree?.id ??
      null;

    const name =
      l?.degree?.name ??
      l?.degree_name ??
      null;

    const key =
      id != null
        ? `id:${String(id)}`
        : name
        ? `name:${_strip(String(name))}`
        : null;

    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  let bestKey = null;
  let max = 0;

  for (const [k, v] of map.entries()) {
    if (v > max) {
      max = v;
      bestKey = k;
    }
  }

  if (!bestKey) return null;

  if (bestKey.startsWith("id:")) {
    return { id: bestKey.slice(3), name: null };
  }

  if (bestKey.startsWith("name:")) {
    return { id: null, name: bestKey.slice(5) };
  }

  return null;
}

/* ────────────────────────────── Component ────────────────────────────── */
export default function StudentTimeTable() {
  const [lessons, setLessons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");



  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  );
  const [subjectFilter, setSubjectFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // responsive switch
  const resizeTimer = useRef();
  useEffect(() => {
    const onResize = () => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        if (window.innerWidth < 640) setView((v) => (v === "grid" ? "agenda" : v));
      }, 120);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const mondayIso = useMemo(() => {
    const y = monday.getFullYear();
    const m = pad2(monday.getMonth() + 1);
    const d = pad2(monday.getDate());
    return `${y}-${m}-${d}`;
  }, [monday]);
  const monthsForWeek = useMemo(() => {
    const m1 = `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}`;
    const m2 = `${sunday.getFullYear()}-${pad2(sunday.getMonth() + 1)}`;
    return m1 === m2 ? [m1] : [m1, m2];
  }, [monday, sunday]);

 useEffect(() => {
  let mounted = true;

  (async () => {
    setLoading(true);
    try {
      // 1️⃣ Fetch weekly lessons + subject catalog (student already scoped by backend)
      const weekRes = await fetchStudentWeek({ week_start: mondayIso });

      

      // 2️⃣ Normalize weekly lessons
      const rawWeekly = unwrapLessons(weekRes);

      const weekly = (rawWeekly ?? []).map((l) => {
        const normalizedSubject = decorateSubjectFromRaw(l);

        return {
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
          subject: normalizedSubject,
          subject_id:
            l?.subject_id ??
            normalizedSubject?.id ??
            l?.subject?.id ??
            undefined,

          room: l?.room ?? (l?.room_id ? null : undefined),

          start_time: getStartStr(l),
          end_time: getEndStr(l),
          start_minutes: numOrNull(l?.start_minutes) ?? undefined,
          end_minutes: numOrNull(l?.end_minutes) ?? undefined,

          is_plan: false,
          plan_date: null,
          week_start: l?.week_start ?? l?.weekStart ?? mondayIso,
        };
      });

      // 3️⃣ Fetch monthly plans intersecting this week
      const planPages = await Promise.all(
        monthsForWeek.map((month) =>
          axiosClient
            .get(PLANS_ENDPOINT, { params: { month } })
            .catch(() => null)
        )
      );

      const rawPlans = planPages
        .filter(Boolean)
        .flatMap((p) => unwrapPlans(p));

      const plansInWeek = (rawPlans ?? []).filter((p) => {
        const d = new Date(`${p?.plan_date}T00:00:00`);
        return !Number.isNaN(d) && inWeek(d, monday);
      });

      const plans = plansInWeek.map((p) => {
  const subjId = p?.subject?.id ?? p?.subject_id ?? null;
  const subjName =
  p?.subject?.name ??
  p?.subject_name ??
  null;

  return {
    id: p.id,
    is_plan: true,
    plan_date: p.plan_date,

    degree_id: p.degree_id ?? p?.degree?.id ?? null,
    degree_name: p?.degree?.name ?? p?.degree_name ?? null,

    subject: subjName
      ? { id: subjId, name: subjName, key: subjId ?? slugify(subjName) }
      : null,

    subject_id: subjId ?? undefined,
    room: null,

    start_time: p.start_time ?? null,
    end_time: p.end_time ?? null,
    start_minutes: numOrNull(p?.start_minutes) ?? undefined,
    end_minutes: numOrNull(p?.end_minutes) ?? undefined,

    day_of_week: null,
    week_start: null,

    timetable_id: p.id,
    timetable: p.title ? { id: p.id, title: p.title } : null,
  };
});


      if (!mounted) return;
      const studentDegree = dominantDegreeFromLessons(weekly);


// 5️⃣ Filter plans to student's degree
const plansFiltered = plans.filter((p) => {
  if (!studentDegree?.id) return false;
  return String(p.degree_id) === String(studentDegree.id);
});
      // 6️⃣ Final merge (weekly + degree-filtered plans)
      setLessons([...weekly, ...plansFiltered]);
      setPlans(plansFiltered);
      setErr("");
    } catch (e) {
      console.error(e);
      if (!mounted) return;
      setErr(
        e?.response?.data?.message ||
          "Échec du chargement de l’emploi du temps"
      );
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, [weekOffset, mondayIso, monthsForWeek]);
    const subjects = useMemo(() => {
  const map = new Map();
  for (const l of lessons) {
    if (l?.subject?.id) {
      map.set(String(l.subject.id), l.subject);
    }
  }
  return Array.from(map.values());
}, [lessons]);

  const shownLessons = useMemo(() => {
    return lessons.filter((l) => {
      const okSubject = !subjectFilter || String(subjectKey(l)) === String(subjectFilter);
      const okPlan = planFilter === "all" || String(l?.timetable_id) === String(planFilter);
      return okSubject && okPlan;
    });
  }, [lessons, subjectFilter, planFilter]);
  console.table(plans.map(p => ({
  id: p.id,
  degree_id: p.degree_id,
  degree_name: p.degree_name
})));

  /* ───────────── Rendering ───────────── */
  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!lessons?.length)
    return (
      <div className="p-4 text-center">
        Aucun emploi du temps pour le moment.
        <BackToThisWeekFab show={weekOffset !== 0} onClick={() => setWeekOffset(0)} />
      </div>
    );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">Mon emploi du temps</div>
          <ToolbarSubtitle weekOffset={weekOffset} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
              Cette semaine
            </button>
          )}
          {plans.length > 0 && (
            <Select
              value={planFilter}
              onChange={setPlanFilter}
              options={[{ value: "all", label: "Tous les plans" }, ...plans.map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
          <Select
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[{ value: "", label: "Toutes les matières" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <ViewToggle value={view} onChange={setView} />
          <IcsButton lessons={shownLessons} weekOffset={weekOffset} />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
            Imprimer
          </button>
        </div>
      </div>

      {/* Legend */}
      <Legend subjects={subjects} />

      {/* Content */}
      {view === "grid" ? <WeekGrid lessons={shownLessons} weekOffset={weekOffset} /> : <AgendaList lessons={shownLessons} weekOffset={weekOffset} />}

      <BackToThisWeekFab show={weekOffset !== 0} onClick={() => setWeekOffset(0)} />
    </div>
  );
}

/* ───────────────────────────── Small pieces ───────────────────────────── */
function ToolbarSubtitle({ weekOffset }) {
  const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
  const sunday = addDays(monday, 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return <div className="text-sm text-muted-foreground">Semaine du {fmt(monday)} – {fmt(sunday)}</div>;
}
function WeekToolbar({ onPrev, onToday, onNext }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" role="toolbar" aria-label="Semaine">
      <button onClick={onPrev} className="px-3 py-1.5 text-sm hover:bg-muted/60" aria-label="Semaine précédente">←</button>
      <button onClick={onToday} className="px-3 py-1.5 text-sm hover:bg-muted/60 border-x" aria-label="Revenir à cette semaine">Aujourd’hui</button>
      <button onClick={onNext} className="px-3 py-1.5 text-sm hover:bg-muted/60" aria-label="Semaine suivante">→</button>
    </div>
  );
}
function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" role="tablist" aria-label="Vue">
      <button className={`px-3 py-1.5 text-sm ${value === "grid" ? "bg-primary/10" : "hover:bg-muted/60"}`} onClick={() => onChange("grid")} role="tab" aria-selected={value === "grid"}>Grille</button>
      <button className={`px-3 py-1.5 text-sm border-l ${value === "agenda" ? "bg-primary/10" : "hover:bg-muted/60"}`} onClick={() => onChange("agenda")} role="tab" aria-selected={value === "agenda"}>Agenda</button>
    </div>
  );
}
function Select({ value, onChange, options }) {
  return (
    <select className="px-3 py-1.5 rounded-md border bg-background text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Legend({ subjects }) {
  if (!subjects?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {subjects.map((s) => {
        const key = s.id;
        const solid = subjectColors[key] || `hsl(${hueForSubject(key)} 65% 45%)`;
        const soft = subjectSoftBgFromKey(key);
        return (
          <span key={s.id} className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-2 py-0.5 border" style={{ borderColor: "transparent", background: soft }}>
            <span className="h-3 w-3 rounded-full" style={{ background: solid }} />
            <span className="text-foreground/80">{s.name}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── Week grid ────────────────────────────── */
function WeekGrid({ lessons, weekOffset }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      let day = null;
      if (l.is_plan) {
        if (!l.plan_date) continue;
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (Number.isNaN(date.getTime()) || !inWeek(date, monday)) continue;
        const js = date.getDay();
        day = js === 0 ? 7 : js;
      } else {
        if (l.week_start) {
          const ws = new Date(`${l.week_start}T00:00:00`);
          if (Number.isNaN(ws.getTime()) || !sameMonday(ws, monday)) continue;
        }
        day = normalizeDow(l?.day_of_week);
      }
      if (!day) continue;
      m.get(day)?.push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const A = resolveStartEndMins(a)?.[0];
        const B = resolveStartEndMins(b)?.[0];
        if (A != null && B != null) return A - B;
        if (A != null) return -1;
        if (B != null) return 1;
        return 0;
      });
      m.set(k, arr);
    }
    return m;
  }, [lessons, monday]);

  const { minM, maxM } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const d of DAYS) {
      const arr = byDay.get(d.val) ?? [];
      for (const l of arr) {
        const mins = resolveStartEndMins(l);
        if (!mins) continue;
        min = Math.min(min, mins[0]);
        max = Math.max(max, mins[1]);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      min = 9 * 60; max = 12 * 60;
    }
    min = Math.floor((min - PAD_MINS) / 30) * 30;
    max = Math.ceil((max + PAD_MINS) / 30) * 30;
    min = clamp(min, HARD_MIN, HARD_MAX - 30);
    max = clamp(max, min + 60, HARD_MAX);
    return { minM: min, maxM: max };
  }, [byDay]);

  const range = maxM - minM;

  const lanesByDay = useMemo(() => {
    const out = new Map();
    const UNT_SLOT = 30;
    for (const d of DAYS) {
      const dayItems = byDay.get(d.val) ?? [];
      const timed = [], untimed = [];
      for (const l of dayItems) {
        const mins = resolveStartEndMins(l);
        if (mins) timed.push({ l, s: mins[0], e: mins[1], synthetic: false });
        else untimed.push(l);
      }
      timed.sort((a, b) => a.s - b.s || a.e - b.e);
      const lanes = [];
      for (const it of timed) {
        let placed = false;
        for (const lane of lanes) {
          const last = lane[lane.length - 1];
          if (!last || it.s >= last.e) {
            lane.push(it);
            placed = true;
            break;
          }
        }
        if (!placed) lanes.push([it]);
      }
      if (untimed.length) {
        const pillLane = untimed.map((l, idx) => {
          const s = Math.max(minM, maxM - (idx + 1) * UNT_SLOT);
          const e = Math.min(s + Math.max(UNT_SLOT - 5, 15), maxM);
          return { l, s, e, synthetic: true };
        });
        lanes.unshift(pillLane);
      }
      out.set(d.val, { lanes });
    }
    return out;
  }, [byDay, minM, maxM]);

  const hourMarks = useMemo(() => {
    const arr = [];
    for (let m = minM; m <= maxM; m += 60) arr.push({ h: Math.floor(m / 60), m });
    return arr;
  }, [minM, maxM]);

  const halfHourMarks = useMemo(() => {
    const arr = [];
    for (let m = minM + 30; m < maxM; m += 60) arr.push(m);
    return arr;
  }, [minM, maxM]);

  const hasAny = useMemo(() => DAYS.some((d) => (byDay.get(d.val) ?? []).length), [byDay]);
  if (!hasAny) {
    return <div className="rounded-md border p-3 text-sm text-muted-foreground">Aucune séance pour cette semaine.</div>;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px] md:min-w-0">
          {/* header */}
          <div className="grid grid-cols-8 bg-muted/50 text-xs sm:text-sm sticky top-0 z-20">
            <div className="px-2 py-2 text-muted-foreground sticky left-0 bg-muted/50 z-30">Heure</div>
            {DAYS.map((d, idx) => {
              const date = addDays(monday, idx);
              const isToday = isSameDayIndex(new Date(), d.val) && weekOffset === 0;
              return (
                <div key={d.val} className={`px-2 py-2 font-medium ${isToday ? "text-primary" : ""}`}>
                  <div className="hidden sm:block">{d.full}</div>
                  <div className="sm:hidden">{d.label}</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground">
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* body */}
          <div className="grid grid-cols-8">
            {/* hour rail */}
            <div className="relative border-r bg-background sticky left-0 z-10">
              {hourMarks.map(({ h, m }) => {
                const pct = ((m - minM) / range) * 100;
                return (
                  <div key={m} className="absolute left-0 right-0" style={{ top: `${pct}%`, transform: "translateY(-50%)" }}>
                    <div className="text-[11px] sm:text-xs text-muted-foreground px-2">{pad2(h)}:00</div>
                    <div className="h-px bg-border/70" />
                  </div>
                );
              })}
              <div style={{ paddingTop: `${range}px` }} className="opacity-0">.</div>
            </div>

            {/* day columns */}
            {DAYS.map((d) => {
              const { lanes } = lanesByDay.get(d.val) ?? { lanes: [] };
              const laneCount = Math.max(1, lanes.length);
              return (
                <div key={d.val} className="relative border-l bg-background/50">
                  {hourMarks.map(({ m }) => {
                    const pct = ((m - minM) / range) * 100;
                    return <div key={`h-${m}`} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
                  })}
                  {halfHourMarks.map((m) => {
                    const pct = ((m - minM) / range) * 100;
                    return <div key={`hh-${m}`} className="absolute left-0 right-0 h-px bg-border/30" style={{ top: `${pct}%` }} />;
                  })}

                  {/* lessons */}
                  {lanes.map((lane, laneIndex) =>
                    lane.map(({ l, s, e, synthetic }, i) => {
                      const s2 = clamp(s, minM, maxM);
                      const e2 = clamp(e, minM, maxM);
                      if (e2 <= minM || s2 >= maxM) return null;

                      const topPct = ((s2 - minM) / range) * 100;
                      const heightPct = Math.max(((e2 - s2) / range) * 100, synthetic ? 0.6 : 0.8);
                      const widthPct = 100 / laneCount;
                      const leftPct = laneIndex * widthPct;

                      const subjName = l?.subject?.name ?? l?.subject_name ?? "Matière";
                      const solid = subjectSolidColor(l);
                      const rName = roomName(l);
                      const sText = parseTimeLike(getStartStr(l));
                      const eText = parseTimeLike(getEndStr(l));

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className={`absolute rounded-lg text-[11px] sm:text-sm overflow-hidden ${synthetic ? "ring-1 ring-white/60" : ""}`}
                          title={`${subjName}${rName ? ` • ${rName}` : ""}${sText && eText ? ` (${sText}–${eText})` : ""}`}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            backgroundColor: solid,
                            color: "#fff",
                            boxShadow: `0 6px 14px rgba(0,0,0,0.18)`,
                            opacity: synthetic ? 0.9 : 1,
                          }}
                        >
                          <div className="px-2 py-1 font-semibold leading-tight truncate">
                            {subjectAbbr(subjName)}
                          </div>
                          <div className="px-2 text-[10px] sm:text-[11px] leading-tight">
                            {sText && eText ? `${sText}–${eText}` : (synthetic ? "Sans horaire" : "")}
                          </div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] leading-tight truncate">
                            {roomAbbr(rName)}
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div style={{ height: `${range}px` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Agenda list ────────────────────────────── */
function AgendaList({ lessons, weekOffset }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      if (l.is_plan && l.plan_date) {
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (!Number.isNaN(date.getTime()) && inWeek(date, monday)) {
          const js = date.getDay();
          const dow = js === 0 ? 7 : js;
          m.get(dow)?.push(l);
        }
        continue;
      }
      if (l.week_start) {
        const ws = new Date(`${l.week_start}T00:00:00`);
        if (Number.isNaN(ws.getTime()) || !sameMonday(ws, monday)) continue;
      }
      const day = normalizeDow(l?.day_of_week);
      if (!day) continue;
      m.get(day)?.push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (resolveStartEndMins(a)?.[0] ?? 0) - (resolveStartEndMins(b)?.[0] ?? 0));
      m.set(k, arr);
    }
    return m;
  }, [lessons, monday]);

  return (
    <div className="space-y-6">
      {DAYS.map((d, idx) => {
        const date = addDays(monday, idx);
        const list = byDay.get(d.val) ?? [];
        return (
          <div key={d.val}>
            <div className="text-sm font-semibold text-foreground/90 mb-2">
              {d.full} • {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <div className="space-y-2">
              {list.length ? (
                list.map((l, i) => {
                  const key = subjectKey(l);
                  const solid = subjectSolidColor(l);
                  const soft = subjectSoftBgFromKey(key);
                  const rName = roomName(l);
                  const times = resolveStartEndMins(l);
                  const timeStr = times
                    ? `(${pad2(Math.floor(times[0] / 60))}:${pad2(times[0] % 60)}–${pad2(Math.floor(times[1] / 60))}:${pad2(times[1] % 60)})`
                    : (l?.period ? `(Période ${l.period})` : "");
                  return (
                    <div key={l.id ?? `${d.val}-${i}`} className="rounded-xl border p-3" style={{ background: soft, borderColor: "transparent" }}>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: solid, color: "#fff" }}>
                          {l?.subject?.name ?? l?.subject_name ?? "Matière"}
                        </span>
                        {timeStr ? <span className="text-muted-foreground">{timeStr}</span> : null}
                      </div>
                      <div className="text-xs text-foreground/80">{rName ? rName : ""}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── Export ICS ─────────────────────────────── */
function IcsButton({ lessons, weekOffset }) {
  const download = () => {
    const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const events = [];
    for (const l of lessons ?? []) {
      if (l.is_plan) continue;
      if (l.week_start) {
        const ws = new Date(`${l.week_start}T00:00:00`);
        if (Number.isNaN(ws.getTime()) || !sameMonday(ws, monday)) continue;
      }
      const dow = normalizeDow(l?.day_of_week);
      if (!dow) continue;

      const date = addDays(monday, dow - 1);
      const mins = resolveStartEndMins(l);
      if (!mins) continue;

      const start = new Date(date), end = new Date(date);
      start.setHours(Math.floor(mins[0] / 60), mins[0] % 60, 0, 0);
      end.setHours(Math.floor(mins[1] / 60), mins[1] % 60, 0, 0);

      const subj = l?.subject?.name ?? l?.subject_name ?? "Séance";
      const room = roomName(l);

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start, end,
        title: subj,
        location: room,
        desc: "",
      });
    }
    const ics = buildIcs(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eleve-emploi-du-temps.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">Export .ics</button>;
}

/* ───────────────────────────── Other small utils ───────────────────────────── */
const roomAbbr = (r) => {
  if (!r) return "";
  const s = String(r);
  const m = s.match(/(?:salle|room)\s*([a-z]?)(\d+)/i);
  if (m) return `S-${(m[1] || "").toUpperCase()}${m[2]}`;
  if (/^S-\w+/i.test(s)) return s;
  return s.length > 8 ? `S-${s.replace(/\s+/g, "").slice(0, 6)}` : s;
}
