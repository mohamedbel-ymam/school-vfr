// src/components/student/StudentTimeTable.jsx
import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../api/axios";
import subjectColors from "../../config/subjectColors";

/* --------------------------------- Abbreviations --------------------------------- */
const _strip = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const SUBJECT_ABBR = {
  "physique & chimie": "PC",
  "physique et chimie": "PC",
  "physique-chimie": "PC",
  "français": "FR",
  "francais": "FR",
  "mathématiques": "MA",
  "mathematiques": "MA",
  "maths": "MA",
  "anglais": "AN",
  "arabe": "AR",
  "svt": "SVT",
  "histoire géographie": "HG",
  "histoire-geographie": "HG",
  "histoire-géographie": "HG",
  "informatique": "INFO",
  "éducation physique": "EPS",
  "education physique": "EPS",
  "philosophie": "PHI",
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

const roomAbbr = (r) => {
  if (!r) return "";
  const s = String(r);
  const m = s.match(/(?:salle|room)\s*([a-z]?)(\d+)/i);
  if (m) return `S-${(m[1] || "").toUpperCase()}${m[2]}`;
  if (/^S-\w+/i.test(s)) return s;
  return s.length > 8 ? `S-${s.replace(/\s+/g, "").slice(0, 6)}` : s;
};

/* --------------------------------- Constantes --------------------------------- */
const DAYS = [
  { label: "Lun", full: "Lundi", val: 1 },
  { label: "Mar", full: "Mardi", val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi", val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi", val: 6 },
  { label: "Dim", full: "Dimanche", val: 7 },
];

// Fallback/parse constants
const SCHOOL_START_MINS = 9 * 60;
const PERIOD_DURATION_MINS = 90;

// Hard clamps for dynamic window
const HARD_MIN = 7 * 60;
const HARD_MAX = 22 * 60;
const PAD_MINS = 30;

/* ---------------------------------- Helpers ----------------------------------- */
const unwrapLessons = (res) => res?.data?.data?.lessons ?? res?.data?.lessons ?? [];

const pad = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const normalizeDow = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 7;
  if (n < 0) return null;
  if (n > 7) return (n % 7) || 7;
  return n;
};

// accept 1 or 2-digit hour, and optional seconds
const extractHHMM = (v) => {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2})?/);
  return m ? `${pad(+m[1])}:${pad(+m[2])}` : null;
};

/** Accepts "09", "9:30", "09:30:00", "9h30", "9.30" → "HH:MM" */
const parseTimeLike = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return `${pad(+m[1])}:${pad(+m[2])}`;
  m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (m) return `${pad(+m[1])}:${pad(+(m[2] ?? 0))}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${pad(+m[1])}:${pad(+m[2])}`;
  m = s.match(/^(\d{1,2})$/);
  if (m) return `${pad(+m[1])}:00`;
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
  const js = d.getDay(); // 0=Dim..6=Sam
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
const sameMonday = (a, b) =>
  startOfWeekMonday(a).getTime() === startOfWeekMonday(b).getTime();

const isSameDayIndex = (date, dow1to7) => {
  const js = date.getDay(); // 0..6
  const ours = js === 0 ? 7 : js; // 1..7
  return ours === dow1to7;
};
const inWeek = (date, monday) => {
  const start = new Date(monday);
  const end = addDays(monday, 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
};

// ---- Subject colors ----
const slugify = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const subjectKey = (l) =>
  l?.subject?.key ??
  l?.subject?.id ??
  l?.subject_id ??
  slugify(l?.subject?.name ?? l?.subject_name ?? "subject");

const hashInt = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const hueForSubject = (key) => (hashInt(String(key)) * 137.508) % 360;

const subjectSolidColor = (l) => {
  const key = String(subjectKey(l));
  if (subjectColors[key]) return subjectColors[key];
  const hue = hueForSubject(key);
  return `hsl(${hue} 65% 45%)`;
};
const subjectSoftBgFromKey = (key) => {
  const hue = hueForSubject(key);
  return `hsl(${hue} 65% 45% / 0.14)`;
};

const roomName = (l) => l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

/* ---------------- Time extraction (tolerant) ---------------- */
const pickFirst = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

const getStartStr = (l) =>
  pickFirst(
    l?.start,
    l?.start_time,
    l?.starts_at && extractHHMM(l?.starts_at),
    l?.from,
    l?.hour_from,
    l?.begin,
    l?.time_from
  ) ?? null;

const getEndStr = (l) =>
  pickFirst(
    l?.end,
    l?.end_time,
    l?.ends_at && extractHHMM(l?.ends_at),
    l?.to,
    l?.hour_to,
    l?.finish,
    l?.time_to
  ) ?? null;

const numOrNull = (v) => {
  if (v === 0 || v === "0") return 0;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getStartMin = (l) => {
  const n = numOrNull(l?.start_minutes);
  return n != null ? n : toMins(getStartStr(l));
};
const getEndMin = (l) => {
  const n = numOrNull(l?.end_minutes);
  return n != null ? n : toMins(getEndStr(l));
};

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
    const end = start + PERIOD_DURATION_MINS;
    return [start, end];
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

/* ----------------------------------- ICS ------------------------------------- */
const toIcsDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const buildIcs = (events) => {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Takwa Etablissement//Élève Emploi du temps//EN"];
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

/* =============================== API helpers =============================== */
const PLANS_ENDPOINT = "/eleve/monthly-plans"; // ← change if your route differs
const unwrapPlans = (r) => r?.data?.data ?? r?.data ?? [];

/* ============================================================================ */

export default function StudentTimeTable() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  );
  const [subjectFilter, setSubjectFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // compute months covering the visible week
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const mondayIso = useMemo(() => {
    const y = monday.getFullYear();
    const m = pad(monday.getMonth() + 1);
    const d = pad(monday.getDate());
    return `${y}-${m}-${d}`;
  }, [monday]);
  const monthsForWeek = useMemo(() => {
    const m1 = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}`;
    const m2 = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}`;
    return m1 === m2 ? [m1] : [m1, m2];
  }, [monday, sunday]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // 1) weekly lessons (ask backend to filter by Monday if supported)
        const res = await TimeTableApi.student({ week_start: mondayIso });
        const raw = unwrapLessons(res);

        const weekly = (raw ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
          subject:
            l?.subject?.id || l?.subject_id
              ? { id: l.subject?.id ?? l.subject_id, name: l.subject?.name ?? l.subject_name ?? "Matière", key: l?.subject?.key }
              : l?.subject?.name
              ? { id: null, name: l.subject.name }
              : l?.subject,
          room: l?.room ?? (l?.room_id ? null : undefined),

          // normalize time fields for UI (we still prefer *_minutes when provided)
          start_time: getStartStr(l),
          end_time: getEndStr(l),
          start_minutes: numOrNull(l?.start_minutes) ?? undefined,
          end_minutes: numOrNull(l?.end_minutes) ?? undefined,

          is_plan: false,
          plan_date: null,
          week_start: l?.week_start ?? l?.weekStart ?? mondayIso,
        }));

        // 2) monthly plans for visible week (merge)
        const planPages = await Promise.all(
          monthsForWeek.map((month) => axiosClient.get(PLANS_ENDPOINT, { params: { month } }))
        );
        const rawPlans = planPages.flatMap((p) => unwrapPlans(p));

        const plansInWeek = (rawPlans ?? []).filter((p) => {
          const d = new Date(`${p?.plan_date}T00:00:00`);
          return !Number.isNaN(d) && inWeek(d, monday);
        });

        const plans = plansInWeek.map((p) => ({
          id: p.id,
          is_plan: true,
          plan_date: p.plan_date, // YYYY-MM-DD
          subject: p.subject ? { id: p.subject.id, name: p.subject.name } : null,
          room: null,

          start_time: p.start_time ?? null,
          end_time: p.end_time ?? null,
          start_minutes: numOrNull(p?.start_minutes) ?? undefined,
          end_minutes: numOrNull(p?.end_minutes) ?? undefined,

          day_of_week: null,
          week_start: null,
          timetable_id: p.id,
          timetable: p.title ? { id: p.id, title: p.title } : null,
        }));

        if (!mounted) return;
        setLessons([...weekly, ...plans]);
        setErr("");
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.response?.data?.message || "Échec du chargement de l’emploi du temps");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [weekOffset, monthsForWeek, mondayIso, monday]);

  // filters data
  const subjects = useMemo(() => {
    const s = new Map();
    for (const l of lessons) {
      const key = subjectKey(l);
      const name = l?.subject?.name ?? l?.subject_name ?? "Matière";
      s.set(String(key), name);
    }
    return [...s.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const plans = useMemo(() => {
    const p = new Map();
    for (const l of lessons) {
      const pid = l?.timetable_id;
      if (pid != null) p.set(String(pid), l?.timetable?.title ?? `Plan #${pid}`);
    }
    return [...p.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const shownLessons = useMemo(() => {
    return lessons.filter((l) => {
      const okSubject = !subjectFilter || String(subjectKey(l)) === String(subjectFilter);
      const okPlan = planFilter === "all" || String(l?.timetable_id) === String(planFilter);
      return okSubject && okPlan;
    });
  }, [lessons, subjectFilter, planFilter]);

  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!lessons?.length) return <div className="p-4 text-center">Aucun emploi du temps pour le moment.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* En-tête */}
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
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">Imprimer</button>
        </div>
      </div>

      {/* Légende */}
      <Legend subjects={subjects} />

      {/* Contenu */}
      {view === "grid" ? (
        <WeekGrid lessons={shownLessons} weekOffset={weekOffset} />
      ) : (
        <AgendaList lessons={shownLessons} weekOffset={weekOffset} />
      )}
    </div>
  );
}

/* ----------------------------- Petits composants ------------------------------ */
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

/* ----------------------------- Grille hebdomadaire ---------------------------- */
function WeekGrid({ lessons, weekOffset }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  // group ALL items per day (timed + untimed), respecting plans & week_start
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      let day = null;
      if (l.is_plan) {
        if (!l.plan_date) continue;
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (Number.isNaN(date.getTime()) || !inWeek(date, monday)) continue;
        const js = date.getDay(); day = js === 0 ? 7 : js;
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
    // timed first
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

  // dynamic vertical window from TIMED items
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

  // lanes: timed packed; untimed as compact pills lane
  const lanesByDay = useMemo(() => {
    const out = new Map();
    const UNT_SLOT = 30; // minutes height per untimed pill
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
          if (!last || it.s >= last.e) { lane.push(it); placed = true; break; }
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
          {/* entêtes */}
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

          {/* corps */}
          <div className="grid grid-cols-8">
            {/* rail des heures */}
            <div className="relative border-r bg-background sticky left-0 z-10">
              {hourMarks.map(({ h, m }) => {
                const pct = ((m - minM) / range) * 100;
                return (
                  <div key={m} className="absolute left-0 right-0" style={{ top: `${pct}%`, transform: "translateY(-50%)" }}>
                    <div className="text-[11px] sm:text-xs text-muted-foreground px-2">{pad(h)}:00</div>
                    <div className="h-px bg-border/70" />
                  </div>
                );
              })}
              <div style={{ paddingTop: `${range}px` }} className="opacity-0">.</div>
            </div>

            {/* colonnes jour */}
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

                  {/* séances */}
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

/* ------------------------------------- Agenda --------------------------------- */
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
      arr.sort((a, b) => {
        const A = resolveStartEndMins(a)?.[0] ?? 0;
        const B = resolveStartEndMins(b)?.[0] ?? 0;
        return A - B;
      });
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
                    ? `(${pad(Math.floor(times[0] / 60))}:${pad(times[0] % 60)}–${pad(Math.floor(times[1] / 60))}:${pad(times[1] % 60)})`
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

/* --------------------------------- Export ICS --------------------------------- */
function IcsButton({ lessons, weekOffset }) {
  const download = () => {
    const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const events = [];
    for (const l of lessons ?? []) {
      if (l.is_plan) continue; // skip monthly plans in calendar export
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
