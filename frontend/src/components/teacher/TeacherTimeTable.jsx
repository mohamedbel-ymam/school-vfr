// src/components/teacher/TeacherTimetable.jsx
import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import subjectColors from "../../config/subjectColors";

/* ───────────────────── Utilities & constants ───────────────────── */

const DAYS = [
  { label: "Lun", full: "Lundi", val: 1 },
  { label: "Mar", full: "Mardi", val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi", val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi", val: 6 },
  { label: "Dim", full: "Dimanche", val: 7 },
];

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

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay(); // 0..6
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

const _strip = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** “FR/MA/AN…” or initials up to 4 chars */
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

const degreeAbbr = (name = "") => {
  const n = _strip(name);
  if (!n) return "Niv.";
  if (/(^|\s)3(\s|e|eme|ème).*(college|collegue|colle|ac)/i.test(n)) return "3AC";
  if (/tronc\s*commun|^tc$/.test(n)) return "TC";
  const bac = n.includes("bac");
  const one = /\b1\b|premiere|1ere|1re/.test(n);
  const two = /\b2\b|deuxieme|2eme|2e/.test(n);
  const sm = /sciences?\s*mat(h)?|sm\b/.test(n);
  const sp = /sciences?\s*phys|sp\b/.test(n);
  const svt = /\bsvt\b|sciences?\s*vie/.test(n);
  const l = /\blettres?\b|litt/i.test(n);
  if (bac && one) {
    if (sm) return "1Bac(SM)";
    if (sp) return "1Bac(SP)";
    if (svt) return "1Bac(SVT)";
    if (l) return "1Bac(L)";
    return "1Bac";
  }
  if (bac && two) {
    if (sm) return "2Bac(SM)";
    if (sp) return "2Bac(SP)";
    if (svt) return "2Bac(SVT)";
    if (l) return "2Bac(L)";
    return "2Bac";
  }
  return name.length > 10 ? name.slice(0, 10) + "…" : name;
};

const slugify = (s = "") =>
  s.normalize?.("NFD")?.replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const hashInt = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const goldenHue = (k) => (hashInt(k) * 137.508) % 360;
const subjectKey = (l) =>
  l?.subject?.key ??
  (l?.subject?.name ? slugify(l.subject.name) : null) ??
  (l?.subject?.id ?? l?.subject_id ?? "subject");
const subjectBlockColors = (l) => {
  const key = String(subjectKey(l) ?? "subject");
  const fixed = subjectColors?.[key];
  if (fixed) return { bg: `${fixed}22`, border: fixed, accent: fixed };
  const hue = goldenHue(key);
  return { bg: `hsla(${hue},85%,45%,0.20)`, border: `hsl(${hue},65%,45%)`, accent: `hsl(${hue},85%,45%)` };
};
const roomName = (l) => l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

/* time parsing */
const extractHHMM = (v) => {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(?:T|\s)?(\d{1,2}):(\d{2})(?::\d{2})?/);
  return m ? `${pad(+m[1])}:${pad(+m[2])}` : null;
};
const pickFirst = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const getStartStr = (l) =>
  pickFirst(l?.start, l?.start_time, l?.starts_at && extractHHMM(l?.starts_at), l?.from, l?.hour_from, l?.begin, l?.time_from) ?? null;
const getEndStr = (l) =>
  pickFirst(l?.end, l?.end_time, l?.ends_at && extractHHMM(l?.ends_at), l?.to, l?.hour_to, l?.finish, l?.time_to) ?? null;

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
const numOrNull = (v) => {
  if (v === 0 || v === "0") return 0;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* baseline for period fallback */
const SCHOOL_START_MINS = 9 * 60;
const PERIOD_DURATION_MINS = 90;

const parsePeriodToMins = (period) => {
  if (!period && period !== 0) return null;
  const s = String(period).trim();
  let m = s.match(/(\d{1,2}[:h.]\d{0,2})\s*[-–—àto]+\s*(\d{1,2}[:h.]\d{0,2})/i);
  if (m) {
    const sm = toMins(m[1]); const em = toMins(m[2]);
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

const resolveStartEndMins = (l) => {
  const sm = numOrNull(l?.start_minutes);
  const em = numOrNull(l?.end_minutes);
  if (sm != null && em != null && em > sm) return [sm, em];

  const s = toMins(getStartStr(l));
  const e = toMins(getEndStr(l));
  if (s != null && e != null && e > s) return [s, e];

  const p = parsePeriodToMins(l?.period);
  if (p) return p;

  return null;
};

/* unwrap lessons array from various response shapes */
const unwrapLessons = (r) =>
  r?.data?.data?.lessons ??
  r?.data?.lessons ??
  (Array.isArray(r?.data?.data) ? r.data.data : Array.isArray(r?.data) ? r.data : []);

/* ICS helpers */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const buildIcs = (events) => {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Takwa Etablissement//Enseignant Emploi du temps//EN"];
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

/* ───────────────────── Main component ───────────────────── */

export default function TeacherTimetable() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  );
  const [subjectFilter, setSubjectFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");

  const monday = useMemo(
    () => startOfWeekMonday(addDays(new Date(), weekOffset * 7)),
    [weekOffset]
  );
  const mondayIso = useMemo(() => {
    const y = monday.getFullYear();
    const m = pad(monday.getMonth() + 1);
    const d = pad(monday.getDate());
    return `${y}-${m}-${d}`;
  }, [monday]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Ask backend for the visible week
        const res = await TimeTableApi.teacher({ week_start: mondayIso });
        const raw = unwrapLessons(res);

        const normalized = (raw ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),

          // normalize time fields (prefer minutes)
          start_time: getStartStr(l),
          end_time: getEndStr(l),
          start_minutes: numOrNull(l?.start_minutes) ?? undefined,
          end_minutes: numOrNull(l?.end_minutes) ?? undefined,

          is_plan: Boolean(l?.plan_id || l?.plan_date || l?.is_plan),
          plan_date: l?.plan_date ?? l?.date ?? null,
          week_start: l?.week_start ?? l?.weekStart ?? mondayIso,
        }));

        if (!mounted) return;
        setLessons(normalized);
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
  }, [mondayIso]);

  // Filters
  const subjects = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const id = String(subjectKey(l));
      const name = l?.subject?.name ?? l?.subject_name ?? "Matière";
      m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const degrees = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const id = l?.degree?.id ?? l?.degree_id ?? l?.timetable?.degree?.id ?? l?.timetable?.degree?.name ?? "degree";
      const name = l?.degree?.name ?? l?.degree_name ?? l?.timetable?.degree?.name ?? "Niveau";
      m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const filtered = useMemo(() => {
    let arr = lessons ?? [];
    if (subjectFilter) {
      arr = arr.filter((l) => String(subjectKey(l)) === String(subjectFilter));
    }
    if (degreeFilter) {
      arr = arr.filter(
        (l) =>
          String(l?.degree?.id ?? l?.degree_id ?? l?.timetable?.degree?.id ?? l?.timetable?.degree?.name) ===
          String(degreeFilter)
      );
    }
    return arr;
  }, [lessons, subjectFilter, degreeFilter]);

  const hasTimed = useMemo(() => (filtered ?? []).some((x) => Boolean(resolveStartEndMins(x))), [filtered]);

  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!lessons?.length) return <div className="p-4 text-center">Aucun cours pour l’instant.</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">Mes cours (semaine)</div>
          <ToolbarSubtitle monday={monday} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />
          <Select
            value={degreeFilter}
            onChange={setDegreeFilter}
            options={[{ value: "", label: "Tous les niveaux" }, ...degrees.map((d) => ({ value: d.id, label: d.name }))]}
          />
          <Select
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[{ value: "", label: "Toutes les matières" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <ViewToggle value={view} onChange={setView} />
          <IcsButton lessons={filtered} monday={monday} />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">Imprimer</button>
        </div>
      </div>

      {view === "grid" ? (
        hasTimed ? (
          <WeekGrid lessons={filtered} monday={monday} />
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Aucune séance avec horaire précis. Ajoutez <code>start_time</code>/<code>end_time</code> ou un <code>period</code> côté admin,
            ou basculez en vue <b>Agenda</b>.
          </div>
        )
      ) : (
        <AgendaList lessons={filtered} monday={monday} />
      )}
    </div>
  );
}

/* ───────────────────── Small UI bits ───────────────────── */
function ToolbarSubtitle({ monday }) {
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
function Select({ value, onChange, options }) {
  return (
    <select className="px-3 py-1.5 rounded-md border bg-background text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
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

/* ───────────────────── Grid view ───────────────────── */
function WeekGrid({ lessons, monday }) {
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
    const PAD = 30;
    min = Math.max(7 * 60, Math.floor((min - PAD) / 30) * 30);
    max = Math.min(22 * 60, Math.ceil((max + PAD) / 30) * 30);
    if (max - min < 60) max = min + 60;
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
          {/* header */}
          <div className="grid grid-cols-8 bg-muted/50 text-xs sm:text-sm sticky top-0 z-20">
            <div className="px-2 py-2 text-muted-foreground sticky left-0 bg-muted/50 z-30">Heure</div>
            {DAYS.map((d, idx) => {
              const date = addDays(monday, idx);
              const isToday = isSameDayIndex(new Date(), d.val) && sameMonday(new Date(), monday);
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
                    <div className="text-[11px] sm:text-xs text-muted-foreground px-2">{pad(h)}:00</div>
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

                  {lanes.map((lane, laneIndex) =>
                    lane.map(({ l, s, e, synthetic }, i) => {
                      const s2 = clamp(s, minM, maxM);
                      const e2 = clamp(e, minM, maxM);
                      if (e2 <= minM || s2 >= maxM) return null;

                      const topPct = ((s2 - minM) / range) * 100;
                      const heightPct = Math.max(((e2 - s2) / range) * 100, synthetic ? 0.6 : 0.8);
                      const widthPct = 100 / laneCount;
                      const leftPct = laneIndex * widthPct;

                      const subjName = l?.subject?.name ?? l?.subject_name ?? "Cours";
                      const c = subjectBlockColors(l);
                      const degreeFull = l.degree?.name ?? l.timetable?.degree?.name ?? "Niveau";
                      const degreeShort = degreeAbbr(degreeFull);
                      const room = roomName(l);
                      const startS = parseTimeLike(getStartStr(l));
                      const endS = parseTimeLike(getEndStr(l));

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className={`absolute rounded-lg text-[11px] sm:text-sm overflow-hidden ${synthetic ? "ring-1 ring-white/60" : ""}`}
                          title={`${degreeFull} • ${subjName}${room ? ` • ${room}` : ""}${startS && endS ? ` (${startS}–${endS})` : ""}`}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            backgroundColor: c.border,
                            color: "#fff",
                            boxShadow: `0 6px 16px ${c.accent}44`,
                            opacity: synthetic ? 0.9 : 1,
                          }}
                        >
                          <div className="px-2 pt-1 font-semibold leading-tight truncate">{subjectAbbr(subjName)}</div>
                          <div className="px-2 text-[10px] sm:text-[11px] leading-tight">
                            {startS && endS ? `${startS}–${endS}` : (synthetic ? "Sans horaire" : "")}
                          </div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] leading-tight truncate">{roomAbbr(room)}</div>
                          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">{degreeShort}</div>
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

/* ───────────────────── Agenda view ───────────────────── */
function AgendaList({ lessons, monday }) {
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      if (l.is_plan && l.plan_date) {
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (!Number.isNaN(date.getTime()) && inWeek(date, monday)) {
          const js = date.getDay(); const dow = js === 0 ? 7 : js;
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
                  const degree = l.degree?.name ?? l.timetable?.degree?.name ?? "Niveau";
                  const room = roomName(l);
                  const mins = resolveStartEndMins(l);
                  const timeStr = mins
                    ? `(${pad(Math.floor(mins[0] / 60))}:${pad(mins[0] % 60)}–${pad(Math.floor(mins[1] / 60))}:${pad(mins[1] % 60)})`
                    : (l?.period ? `(Période ${l.period})` : "");
                  return (
                    <div key={l.id ?? `${d.val}-${i}`} className="rounded-xl border p-3 bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-foreground/10">
                          {degreeAbbr(degree)}
                        </span>
                        {timeStr ? <span className="text-muted-foreground">{timeStr}</span> : null}
                      </div>
                      <div className="text-xs text-foreground/80">{room || ""}</div>
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

/* ───────────────────── ICS (ignores plans) ───────────────────── */
function IcsButton({ lessons, monday }) {
  const download = () => {
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

      const degree = l.degree?.name ?? l.timetable?.degree?.name ?? "";
      const subj = l.subject?.name ?? l.subject_name ?? "Cours";
      const room = roomName(l);

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start, end,
        title: degree ? `${degreeAbbr(degree)} • ${subj}` : subj,
        location: room,
        desc: degree ? `Niveau: ${degree}` : "",
      });
    }
    const ics = buildIcs(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "enseignant-emploi-du-temps.ics"; a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">Export .ics</button>;
}
