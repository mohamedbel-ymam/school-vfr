// src/components/student/StudentTimeTable.jsx
import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import subjectColors from "../../config/subjectColors";

/* --------------------------------- Constantes --------------------------------- */
const DAYS = [
  { label: "Lun", full: "Lundi",     val: 1 },
  { label: "Mar", full: "Mardi",     val: 2 },
  { label: "Mer", full: "Mercredi",  val: 3 },
  { label: "Jeu", full: "Jeudi",     val: 4 },
  { label: "Ven", full: "Vendredi",  val: 5 },
  { label: "Sam", full: "Samedi",    val: 6 },
  { label: "Dim", full: "Dimanche",  val: 7 },
];

const SCHOOL_START_MINS    = 9 * 60;   // 09:00
const SCHOOL_END_MINS      = 22 * 60;  // 22:00
const PERIOD_DURATION_MINS = 90;       // 1h30 fallback when only "period" is given

/* ---------------------------------- Helpers ----------------------------------- */
const unwrap = (r) => r?.data?.data ?? r?.data ?? null;

const pad = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const normalizeDow = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 7;
  if (n < 0) return null;
  if (n > 7) return ((n % 7) || 7);
  return n;
};

const extractHHMM = (v) => {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(?:T|\s)?(\d{2}):(\d{2})(?::\d{2})?/);
  return m ? `${m[1]}:${m[2]}` : null;
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
const isSameDayIndex = (date, dow1to7) => {
  const js = date.getDay(); // 0..6
  const ours = js === 0 ? 7 : js; // 1..7
  return ours === dow1to7;
};
const inWeek = (date, monday) => {
  const start = new Date(monday);
  const end = addDays(monday, 6);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return date >= start && date <= end;
};

// ---- Subject colors (fixed-by-key with safe fallback) ----
const slugify = (s = "") =>
  s.normalize?.("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const subjectKey = (l) =>
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
  const hue = hueForSubject(key);
  return `hsl(${hue} 65% 45%)`;
};
const subjectSoftBgFromKey = (key) => {
  const hue = hueForSubject(key);
  return `hsl(${hue} 65% 45% / 0.14)`;
};

const roomName = (l) => l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

// --- time extraction from any backend shape ---
const getStartStr = (l) =>
  l?.start_time ??
  extractHHMM(l?.starts_at) ??
  l?.start ??
  null;

const getEndStr = (l) =>
  l?.end_time ??
  extractHHMM(l?.ends_at) ??
  l?.end ??
  null;

const getStartMin = (l) =>
  Number.isFinite(l?.start_minutes) ? l.start_minutes : toMins(getStartStr(l));
const getEndMin = (l) =>
  Number.isFinite(l?.end_minutes) ? l.end_minutes : toMins(getEndStr(l));

const parsePeriodToMins = (period) => {
  if (!period) return null;
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

// minutes to render for any row (weekly or plan)
const resolveStartEndMins = (row) => {
  if (Number.isFinite(row?.start_minutes) && Number.isFinite(row?.end_minutes)) {
    const s = row.start_minutes, e = row.end_minutes;
    if (e > s) return [s, e];
  }
  const s = getStartMin(row);
  const e = getEndMin(row);
  if (s != null && e != null && e > s) return [s, e];
  const p = parsePeriodToMins(row?.period);
  if (p) return p;
  return null;
};

/* ----------------------------------- ICS ------------------------------------- */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}00Z`;
const buildIcs = (events) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Takwa Etablissement//Élève Emploi du temps//EN",
  ];
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

/* ============================================================================ */

export default function StudentTimeTable() {
  const [timetable, setTimetable] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  );
  const [subjectFilter, setSubjectFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await TimeTableApi.student();
        const payload = unwrap(res);
        const raw = Array.isArray(payload) ? payload : payload?.lessons ?? payload?.data ?? [];

        const normalized = (raw ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),

          subject:
            l?.subject?.id || l?.subject_id
              ? { id: l.subject?.id ?? l.subject_id, name: l.subject?.name ?? l.subject_name ?? "Matière" }
              : l?.subject?.name
              ? { id: null, name: l.subject.name }
              : l?.subject,

          room: l?.room ?? (l?.room_id ? null : undefined),

          timetable_id: l?.timetable_id ?? l?.plan_id ?? l?.timetable?.id ?? null,
          timetable: l?.timetable ?? (l?.plan ? { id: l.plan.id, title: l.plan.title } : null),

          // keep time info (any shape)
          start_time: getStartStr(l),
          end_time: getEndStr(l),
          start_minutes: Number.isFinite(l?.start_minutes) ? l.start_minutes : undefined,
          end_minutes: Number.isFinite(l?.end_minutes) ? l.end_minutes : undefined,

          // plan flags + anchor date
          is_plan: Boolean(l?.plan_id || l?.plan_date || l?.is_plan),
          plan_date: l?.plan_date ?? l?.date ?? null, // YYYY-MM-DD
        }));

        setLessons(normalized);
        setTimetable(payload?.timetable ?? payload?.plan ?? null);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Échec du chargement de l’emploi du temps");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          <div className="text-xl font-semibold">{timetable?.title ?? "Mon emploi du temps"}</div>
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
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
            Imprimer
          </button>
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
  return (
    <div className="text-sm text-muted-foreground">
      Semaine du {fmt(monday)} – {fmt(sunday)}
    </div>
  );
}
function WeekToolbar({ onPrev, onToday, onNext }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <button onClick={onPrev} className="px-3 py-1.5 text-sm hover:bg-muted/60">←</button>
      <button onClick={onToday} className="px-3 py-1.5 text-sm hover:bg-muted/60 border-x">Aujourd’hui</button>
      <button onClick={onNext} className="px-3 py-1.5 text-sm hover:bg-muted/60">→</button>
    </div>
  );
}
function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <button
        className={`px-3 py-1.5 text-sm ${value === "grid" ? "bg-primary/10" : "hover:bg-muted/60"}`}
        onClick={() => onChange("grid")}
      >
        Grille
      </button>
      <button
        className={`px-3 py-1.5 text-sm border-l ${value === "agenda" ? "bg-primary/10" : "hover:bg-muted/60"}`}
        onClick={() => onChange("agenda")}
      >
        Agenda
      </button>
    </div>
  );
}
function Select({ value, onChange, options }) {
  return (
    <select
      className="px-3 py-1.5 rounded-md border bg-background text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
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
          <span
            key={s.id}
            className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-2 py-0.5 border"
            style={{ borderColor: "transparent", background: soft }}
          >
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

  // group by day — only timed lessons (skip monthly plans & untimed so no phantom lines)
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      if (l.is_plan) {
        if (!l.plan_date) return null;
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (isNaN(date) || !inWeek(date, monday)) return null; // only that week
        const js = date.getDay(); // 0..6
        day = js === 0 ? 7 : js;  // 1..7
      } else {
        day = normalizeDow(l?.day_of_week);
      }
      if (!day) return null;           // never draw plans on the grid
      const mins = resolveStartEndMins(l);
      if (!mins) continue;                // skip untimed
      const day = normalizeDow(l?.day_of_week);
      if (!day) continue;
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(l);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const A = resolveStartEndMins(a)?.[0] ?? 0;
        const B = resolveStartEndMins(b)?.[0] ?? 0;
        return A - B;
      });
    }
    return m;
  }, [lessons]);

  const minM = SCHOOL_START_MINS, maxM = SCHOOL_END_MINS, range = maxM - minM;

  const lanesByDay = useMemo(() => {
    const out = new Map();
    for (const d of DAYS) {
      const items = (byDay.get(d.val) ?? []).map((l) => {
        const mins = resolveStartEndMins(l);
        return { l, s: mins?.[0] ?? null, e: mins?.[1] ?? null };
      });
      const timed = items.filter((it) => it.s != null && it.e != null && it.e > it.s);
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
      out.set(d.val, { lanes, items: timed });
    }
    return out;
  }, [byDay]);

  const hourMarks = useMemo(() => {
    const arr = [];
    for (let m = minM; m <= maxM; m += 60) arr.push({ h: Math.floor(m / 60), m });
    return arr;
  }, []);
  const halfHourMarks = useMemo(() => {
    const arr = [];
    for (let m = minM + 30; m < maxM; m += 60) arr.push(m);
    return arr;
  }, []);

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
              return (
                <div key={d.val} className="relative border-l bg-background/50">
                  {/* lignes heures */}
                  {hourMarks.map(({ m }) => {
                    const pct = ((m - minM) / range) * 100;
                    return <div key={`h-${m}`} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
                  })}
                  {/* demi-heures */}
                  {halfHourMarks.map((m) => {
                    const pct = ((m - minM) / range) * 100;
                    return <div key={`hh-${m}`} className="absolute left-0 right-0 h-px bg-border/30" style={{ top: `${pct}%` }} />;
                  })}

                  {/* séances (timed only) */}
                  {lanes.map((lane, laneIndex) =>
                    lane.map(({ l, s, e }, i) => {
                      const s2 = clamp(s, minM, maxM);
                      const e2 = clamp(e, minM, maxM);
                      if (e2 <= minM || s2 >= maxM) return null;
                      const topPct = ((s2 - minM) / range) * 100;
                      const heightPct = Math.max(((e2 - s2) / range) * 100, 0.8);
                      const widthPct = Math.max(100 / lanes.length, 25);
                      const leftPct = laneIndex * (100 / lanes.length);

                      const subjName = l?.subject?.name ?? l?.subject_name ?? "Matière";
                      const solid = subjectSolidColor(l);
                      const rName = roomName(l);
                      const sText = parseTimeLike(getStartStr(l));
                      const eText = parseTimeLike(getEndStr(l));

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className="absolute rounded-lg text-[11px] sm:text-sm overflow-hidden"
                          title={`${subjName} ${sText ?? ""}${eText ? `–${eText}` : ""}${rName ? ` • ${rName}` : ""}`}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            backgroundColor: solid,
                            color: "#fff",
                            boxShadow: `0 6px 14px rgba(0,0,0,0.18)`,
                          }}
                        >
                          <div className="px-2 py-1 font-medium truncate">{subjName}</div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] opacity-95 truncate">
                            {sText && eText ? `${sText}–${eText}` : ""}
                            {rName ? ` • ${rName}` : ""}
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

  // weekly rows by day_of_week; monthly plans only on plan_date within the displayed week
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));

    for (const l of lessons ?? []) {
      if (l.is_plan && l.plan_date) {
        const date = new Date(`${l.plan_date}T00:00:00`);
        if (!isNaN(date) && inWeek(date, monday)) {
          const js = date.getDay(); const dow = js === 0 ? 7 : js;
          m.get(dow)?.push(l);
        }
        continue;
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
                    : "";

                  return (
                    <div
                      key={l.id ?? `${d.val}-${i}`}
                      className="rounded-xl border p-3"
                      style={{ background: soft, borderColor: "transparent" }}
                    >
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ background: solid, color: "#fff" }}
                        >
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
  return (
    <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
      Export .ics
    </button>
  );
}
