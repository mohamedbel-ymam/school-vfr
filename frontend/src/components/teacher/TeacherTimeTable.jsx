import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import subjectColors from "../../config/subjectColors";

/* ---------------- helpers & constants ---------------- */

const unwrapLessons = (r) =>
  r?.data?.data?.lessons ?? r?.data?.lessons ?? r?.data?.data ?? r?.data ?? [];

const getStartRaw = (l) => l?.start_time ?? l?.starts_at ?? null;
const getEndRaw   = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const DAYS = [
  { label: "Lun", full: "Lundi",     val: 1 },
  { label: "Mar", full: "Mardi",     val: 2 },
  { label: "Mer", full: "Mercredi",  val: 3 },
  { label: "Jeu", full: "Jeudi",     val: 4 },
  { label: "Ven", full: "Vendredi",  val: 5 },
  { label: "Sam", full: "Samedi",    val: 6 },
  { label: "Dim", full: "Dimanche",  val: 7 },
];

const pad = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** 09, 9:30, 09:30:00, 9h30, 9.30 → "HH:MM" */
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
const isSameDayIndex = (date, dow1to7) => {
  const js = date.getDay();
  const ours = js === 0 ? 7 : js;
  return ours === dow1to7;
};

/* ---------- SUBJECT colors (stable mapping) ---------- */
const slugify = (s = "") =>
  s.normalize?.("NFD")?.replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const hashInt = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};
const goldenHue = (k) => (hashInt(k) * 137.508) % 360;

const subjectKey = (l) =>
  l?.subject?.key ??
  (l?.subject?.name ? slugify(l.subject.name) : null) ??
  (l?.subject?.id ?? l?.subject_id ?? "subject");

const subjectBlockColors = (l) => {
  const key = String(subjectKey(l) ?? "subject");
  const fixed = subjectColors?.[key];
  if (fixed) {
    return { bg: `${fixed}22`, border: fixed, accent: fixed, chip: fixed, chipText: "#fff" };
  }
  const hue = goldenHue(key);
  return {
    bg:     `hsla(${hue},85%,45%,0.20)`,
    border: `hsl(${hue},65%,45%)`,
    accent: `hsl(${hue},85%,45%)`,
    chip:   `hsl(${hue},70%,45%)`,
    chipText: "#fff",
  };
};

/* fixed vertical range (aligns with student grid) */
const SCHOOL_START_MINS = 9 * 60;   // 09:00
const SCHOOL_END_MINS   = 22 * 60;  // 22:00
const PERIOD_DURATION_MINS = 90;    // fallback when only "period" is present

/* If only "period" is given, accept either "1", "P1", or "08:00-09:30" */
const parsePeriodToMins = (period) => {
  if (!period) return null;
  const s = String(period).trim();

  // "08:00-09:30" / "08h00–09h30"
  let m = s.match(/(\d{1,2}[:h.]\d{0,2})\s*[-–—àto]+\s*(\d{1,2}[:h.]\d{0,2})/i);
  if (m) {
    const sm = toMins(m[1]);
    const em = toMins(m[2]);
    if (sm != null && em != null && em > sm) return [sm, em];
  }

  // numeric label (P1, 1, 1ère…)
  m = s.match(/(\d{1,2})/);
  if (m) {
    const idx = Math.max(1, Math.min(20, parseInt(m[1], 10)));
    const start = SCHOOL_START_MINS + (idx - 1) * PERIOD_DURATION_MINS;
    const end = start + PERIOD_DURATION_MINS;
    return [start, end];
  }
  return null;
};

/** Choose minutes to display for a lesson */
const resolveStartEndMins = (l) => {
  const s = toMins(getStartRaw(l));
  const e = toMins(getEndRaw(l));
  if (s != null && e != null && e > s) return [s, e];
  const p = parsePeriodToMins(l?.period);
  if (p) return p;
  return null;
};

/* ---------------- ICS export ---------------- */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}00Z`;
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

/* ===================== main component ===================== */

export default function TeacherTimetable() {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  ); // "grid" | "agenda"
  const [subjectFilter, setSubjectFilter] = useState("");
  const [degreeFilter, setDegreeFilter]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await TimeTableApi.teacher();
        const raw = unwrapLessons(res) ?? [];
        const normalized = raw.map((l) => ({
          ...l,
          start_time: getStartRaw(l),
          end_time: getEndRaw(l),
          is_plan: Boolean(l?.plan_id || l?.plan_date || l?.is_plan),
        }));
        setLessons(normalized);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Échec du chargement de l’emploi du temps");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // subject list (filter)
  const subjects = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const id = l?.subject?.id ?? l?.subject_id ?? l?.subject?.name ?? "subject";
      const name = l.subject?.name ?? "Matière";
      m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  // degree list (filter)
  const degrees = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const d = l.timetable?.degree ?? l.degree ?? null;
      const id = d?.id ?? l.degree_id ?? d?.name ?? "degree";
      const name = d?.name ?? l.degree_name ?? "Niveau";
      m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const filtered = useMemo(() => {
    let arr = lessons ?? [];
    if (subjectFilter) {
      arr = arr.filter(
        (l) => String(l?.subject?.id ?? l?.subject_id ?? l?.subject?.name) === String(subjectFilter)
      );
    }
    if (degreeFilter) {
      arr = arr.filter(
        (l) =>
          String(l.timetable?.degree?.id ?? l.degree?.id ?? l.degree_id ?? l.timetable?.degree?.name ?? l.degree?.name) ===
          String(degreeFilter)
      );
    }
    return arr;
  }, [lessons, subjectFilter, degreeFilter]);

  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!lessons?.length) return <div className="p-4 text-center">Aucun cours pour l’instant.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header / Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">Mes cours (semaine)</div>
          <ToolbarSubtitle weekOffset={weekOffset} />
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
          <IcsButton lessons={filtered} weekOffset={weekOffset} />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
            Imprimer
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "grid" ? (
        <WeekGrid lessons={filtered} weekOffset={weekOffset} />
      ) : (
        <AgendaList lessons={filtered} weekOffset={weekOffset} />
      )}
    </div>
  );
}

/* ===================== UI bits ===================== */

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

/* ===================== VIEW: GRID ===================== */

function WeekGrid({ lessons, weekOffset }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  // group by day — only TIMED lessons (skip monthly plans)
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      if (l.is_plan) continue;
      const mins = resolveStartEndMins(l);
      if (!mins) continue;
      const day = Number(l.day_of_week);
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

  // overlap lanes
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
      out.set(d.val, { lanes });
    }
    return out;
  }, [byDay]);

  // hour & half-hour marks
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
      {/* headers */}
      <div className="grid grid-cols-8 bg-muted/50 text-xs sm:text-sm sticky top-0 z-20">
        <div className="px-2 py-2 text-muted-foreground">Heure</div>
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

      {/* grid body */}
      <div className="grid grid-cols-8">
        {/* time rail */}
        <div className="relative border-r bg-background">
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
          const isToday = isSameDayIndex(new Date(), d.val) && weekOffset === 0;

          return (
            <div key={d.val} className="relative border-l bg-background/50">
              {/* hour lines */}
              {hourMarks.map(({ m }) => {
                const pct = ((m - minM) / range) * 100;
                return <div key={`h-${m}`} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
              })}
              {/* half-hour lines */}
              {halfHourMarks.map((m) => {
                const pct = ((m - minM) / range) * 100;
                return <div key={`hh-${m}`} className="absolute left-0 right-0 h-px bg-border/30" style={{ top: `${pct}%` }} />;
              })}

              {/* NO “now” line anymore */}

              {/* lessons */}
              {lanes.map((lane, laneIndex) =>
                lane.map(({ l, s, e }, i) => {
                  const s2 = clamp(s, minM, maxM);
                  const e2 = clamp(e, minM, maxM);
                  if (e2 <= minM || s2 >= maxM) return null;

                  const topPct = ((s2 - minM) / range) * 100;
                  const heightPct = Math.max(((e2 - s2) / range) * 100, 0.8);
                  const widthPct = Math.max(100 / lanes.length, 25);
                  const leftPct = laneIndex * (100 / lanes.length);

                  const c = subjectBlockColors(l);                  // subject color background
                  const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "Niveau";
                  const room = l.room?.name ?? l.room ?? "";
                  const startS = parseTimeLike(getStartRaw(l));
                  const endS   = parseTimeLike(getEndRaw(l));

                  const info = [
                    startS && endS ? `${startS}–${endS}` : (l.period ? `Créneau ${l.period}` : ""),
                    room || ""
                  ].filter(Boolean).join(" • ");

                  return (
                    <div
                      key={`${l.id ?? `${d.val}-${i}`}`}
                      className="absolute rounded-lg border text-[11px] sm:text-sm overflow-hidden"
                      title={`${degree}${info ? ` • ${info}` : ""}`}
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                        boxShadow: `0 6px 16px ${c.accent}33`,
                      }}
                    >
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.accent }} />
                        <span className="font-medium text-foreground truncate">{degree}</span>
                      </div>
                      <div className="px-2 pb-1 text-[10px] sm:text-[11px] text-muted-foreground truncate">
                        {info}
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
  );
}

/* ===================== VIEW: AGENDA ===================== */

function AgendaList({ lessons, weekOffset }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      const day = Number(l.day_of_week);
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(l);
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
  }, [lessons]);

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
                  const c = subjectBlockColors(l);
                  const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "Niveau";
                  const room = l.room?.name ?? l.room ?? "";
                  const mins = resolveStartEndMins(l);
                  const timeStr = !l.is_plan && mins
                    ? `(${pad(Math.floor(mins[0] / 60))}:${pad(mins[0] % 60)}–${pad(Math.floor(mins[1] / 60))}:${pad(mins[1] % 60)})`
                    : "";

                  return (
                    <div
                      key={l.id ?? `${d.val}-${i}`}
                      className="rounded-xl border p-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                      style={{ borderColor: c.border }}
                    >
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{ background: c.chip, color: c.chipText, border: `1px solid ${c.border}` }}>
                          {degree}
                        </span>
                        {timeStr ? <span className="text-muted-foreground">{timeStr}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {room || ""}
                      </div>
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

/* ===================== ICS Export ===================== */

function IcsButton({ lessons, weekOffset }) {
  const download = () => {
    const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const events = [];
    for (const l of lessons ?? []) {
      if (l.is_plan) continue; // skip monthly plans
      const dow = Number(l.day_of_week);
      if (!dow) continue;
      const date = addDays(monday, dow - 1);
      const mins = resolveStartEndMins(l);
      if (!mins) continue; // only timed

      const start = new Date(date);
      const end = new Date(date);
      start.setHours(Math.floor(mins[0] / 60), mins[0] % 60, 0, 0);
      end.setHours(Math.floor(mins[1] / 60), mins[1] % 60, 0, 0);

      const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "";
      const subj = l.subject?.name ?? "Cours";
      const room = l.room?.name ?? l.room ?? "";

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start,
        end,
        title: degree ? `${degree} • ${subj}` : subj,
        location: room,
        desc: degree ? `Niveau: ${degree}` : "",
      });
    }
    const ics = buildIcs(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enseignant-emploi-du-temps.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
      Export .ics
    </button>
  );
}
