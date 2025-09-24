import { useEffect, useMemo, useState, useRef } from "react";
import TimetableApi from "../../services/api/admin/TimeTableApi";

/* ---------------- helpers & constants ---------------- */

const unwrapLessons = (r) =>
  r?.data?.data?.lessons ?? r?.data?.lessons ?? r?.data?.data ?? r?.data ?? [];

const getStart = (l) => l?.start_time ?? l?.starts_at ?? null; // "HH:mm"
const getEnd   = (l) => l?.end_time   ?? l?.ends_at   ?? null;  // "HH:mm"

const DAYS = [
  { label: "Lun", full: "Monday",    val: 1 },
  { label: "Mar", full: "Tuesday",   val: 2 },
  { label: "Mer", full: "Wednesday", val: 3 },
  { label: "Jeu", full: "Thursday",  val: 4 },
  { label: "Ven", full: "Friday",    val: 5 },
  { label: "Sam", full: "Saturday",  val: 6 },
  { label: "Dim", full: "Sunday",    val: 7 },
];

const pad = (n) => String(n).padStart(2, "0");
const toMins = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay(); // 0 Sun..6 Sat
  const delta = js === 0 ? -6 : 1 - js; // move to Mon
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

/* pleasant/stable color set for subjects */
const HUES = [210, 260, 330, 0, 30, 120, 160];
const subjectHue = (id) => HUES[(Number(id ?? 0) + 7) % HUES.length];
const subjectColors = (id, mode = "block") => {
  const hue = subjectHue(id);
  if (mode === "chip") {
    return {
      bg: `hsl(${hue}, 85%, 45%)`,
      soft: `hsla(${hue},85%,45%,0.12)`,
      text: "#fff",
      border: `hsl(${hue}, 65%, 40%)`,
    };
  }
  return {
    bg: `hsla(${hue}, 85%, 45%, 0.18)`,
    border: `hsl(${hue}, 65%, 45%)`,
    accent: `hsl(${hue}, 85%, 45%)`,
  };
};

/* fixed vertical range (same as student so grids line up) */
const SCHOOL_START_MINS = 9 * 60;   // 09:00
const SCHOOL_END_MINS   = 22 * 60;  // 22:00

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
        // Optionally pass a degree filter: TimetableApi.teacher({ degree_id })
        const res = await TimetableApi.teacher();
        setLessons(unwrapLessons(res) ?? []);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load emploi du temps");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // subject list
  const subjects = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const id = l.subject?.id ?? l.subject_id;
      const name = l.subject?.name ?? "Matière";
      if (id) m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  // degree list (teacher specific)
  const degrees = useMemo(() => {
    const m = new Map();
    for (const l of lessons ?? []) {
      const d = l.timetable?.degree ?? l.degree ?? null;
      const id = d?.id ?? l.degree_id;
      const name = d?.name ?? (l.degree_name ?? "Niveau");
      if (id) m.set(id, name);
    }
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const filtered = useMemo(() => {
    let arr = lessons ?? [];
    if (subjectFilter) {
      arr = arr.filter(
        (l) => String(l.subject?.id ?? l.subject_id) === String(subjectFilter)
      );
    }
    if (degreeFilter) {
      arr = arr.filter(
        (l) =>
          String(l.timetable?.degree?.id ?? l.degree?.id ?? l.degree_id) ===
          String(degreeFilter)
      );
    }
    return arr;
  }, [lessons, subjectFilter, degreeFilter]);

  if (loading) return <div className="p-4 text-center">Loading…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!lessons?.length) return <div className="p-4 text-center">No lessons yet.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header / Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">My Teaching Week</div>
          <ToolbarSubtitle weekOffset={weekOffset} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />
          {/* Degree first (more relevant for teachers) */}
          <Select
            value={degreeFilter}
            onChange={setDegreeFilter}
            options={[
              { value: "", label: "All degrees" },
              ...degrees.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <Select
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "", label: "All subjects" },
              ...subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <ViewToggle value={view} onChange={setView} />
          <IcsButton lessons={filtered} weekOffset={weekOffset} />
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60"
          >
            Print
          </button>
        </div>
      </div>

      {/* Legends */}
      <Legend subjects={subjects} />

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
  const fmt = (d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="text-sm text-muted-foreground">
      Week of {fmt(monday)} – {fmt(sunday)}
    </div>
  );
}

function WeekToolbar({ onPrev, onToday, onNext }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <button onClick={onPrev} className="px-3 py-1.5 text-sm hover:bg-muted/60">←</button>
      <button onClick={onToday} className="px-3 py-1.5 text-sm hover:bg-muted/60 border-x">Today</button>
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
        <option key={o.value ?? "all"} value={o.value}>
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
        Grid
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

function Legend({ subjects }) {
  if (!subjects?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {subjects.map((s) => {
        const c = subjectColors(s.id, "chip");
        return (
          <span
            key={s.id}
            className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-2 py-0.5 border"
            style={{ borderColor: c.border, background: c.soft }}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: c.bg }} />
            <span className="text-foreground/80">{s.name}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ===================== VIEW: GRID ===================== */

function WeekGrid({ lessons, weekOffset }) {
  const monday = useMemo(
    () => startOfWeekMonday(addDays(new Date(), weekOffset * 7)),
    [weekOffset]
  );

  // group by day
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      const day = Number(l.day_of_week);
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const sa = toMins(getStart(a)) ?? 0;
        const sb = toMins(getStart(b)) ?? 0;
        if (sa !== sb) return sa - sb;
        const ea = toMins(getEnd(a)) ?? 0;
        const eb = toMins(getEnd(b)) ?? 0;
        return ea - eb;
      });
    }
    return m;
  }, [lessons]);

  // bounds (fixed like student grid)
  const minMins = SCHOOL_START_MINS;
  const maxMins = SCHOOL_END_MINS;
  const rangeMins = maxMins - minMins;

  // overlap lanes + mark conflicts (teacher can’t be in two places)
  const lanesByDay = useMemo(() => {
    const out = new Map();
    for (const d of DAYS) {
      const items = (byDay.get(d.val) ?? []).map((l) => ({
        l,
        s: toMins(getStart(l)) ?? 0,
        e: toMins(getEnd(l)) ?? 0,
      }));
      const lanes = [];
      for (const it of items) {
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
      // mark conflicts if more than 1 lane on that day
      const conflict = lanes.length > 1;
      out.set(d.val, { lanes, conflict });
    }
    return out;
  }, [byDay]);

  // "now" marker
  const nowRef = useRef(null);
  useEffect(() => {
    const update = () => {
      if (!nowRef.current) return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const pct = (mins - minMins) / rangeMins;
      nowRef.current.style.top = `${clamp(pct, 0, 1) * 100}%`;
    };
    update();
    const t = setInterval(update, 60 * 1000);
    return () => clearInterval(t);
  }, [minMins, rangeMins]);

  // hour marks
  const hourMarks = useMemo(() => {
    const arr = [];
    for (let m = minMins; m <= maxMins; m += 60) {
      const h = Math.floor(m / 60);
      arr.push({ h, m });
    }
    return arr;
  }, [minMins, maxMins]);

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* headers */}
      <div className="grid grid-cols-8 bg-muted/50 text-xs sm:text-sm">
        <div className="px-2 py-2 text-muted-foreground">Time</div>
        {DAYS.map((d, idx) => {
          const date = addDays(monday, idx);
          const isToday = isSameDayIndex(new Date(), d.val) && weekOffset === 0;
          return (
            <div key={d.val} className={`px-2 py-2 font-medium ${isToday ? "text-primary" : ""}`}>
              <div className="hidden sm:block">{d.full}</div>
              <div className="sm:hidden">{d.label}</div>
              <div className="text-xs text-muted-foreground">
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
            const pct = ((m - minMins) / rangeMins) * 100;
            return (
              <div key={m} className="absolute left-0 right-0" style={{ top: `${pct}%`, transform: "translateY(-50%)" }}>
                <div className="text-xs text-muted-foreground px-2">{pad(h)}:00</div>
                <div className="h-px bg-border/70" />
              </div>
            );
          })}
          <div style={{ paddingTop: `${rangeMins}px` }} className="opacity-0">.</div>
        </div>

        {/* day columns */}
        {DAYS.map((d, dayIdx) => {
          const lanePack = lanesByDay.get(d.val) ?? { lanes: [], conflict: false };
          const isToday = isSameDayIndex(new Date(), d.val) && weekOffset === 0;

          return (
            <div key={d.val} className="relative border-l bg-background/50">
              {/* hour lines */}
              {hourMarks.map(({ m }) => {
                const pct = ((m - minMins) / rangeMins) * 100;
                return <div key={m} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
              })}

              {/* NOW line */}
              {isToday && (
                <div
                  ref={dayIdx === 0 ? nowRef : null}
                  className="absolute left-0 right-0 h-[2px] bg-primary/70 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                />
              )}

              {/* lessons */}
              {lanePack.lanes.map((lane, laneIndex) =>
                lane.map(({ l, s, e }, i) => {
                  const s2 = clamp(s, minMins, maxMins);
                  const e2 = clamp(e, minMins, maxMins);
                  if (e2 <= minMins || s2 >= maxMins) return null;

                  const topPct = ((s2 - minMins) / rangeMins) * 100;
                  const heightPct = Math.max(((e2 - s2) / rangeMins) * 100, 0.8);
                  const widthPct = Math.max(100 / lanePack.lanes.length, 25);
                  const leftPct = laneIndex * (100 / lanePack.lanes.length);

                  const subj = l.subject?.name ?? "Matière";
                  const c = subjectColors(l.subject?.id ?? l.subject_id, "block");
                  const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "";
                  const room = l.room?.name ?? l.room ?? "";

                  const conflict = lanePack.lanes.length > 1; // overlapping day
                  const borderColor = conflict ? "#ef4444" : c.border;
                  const accent = conflict ? "#ef4444" : c.accent;

                  return (
                    <div
                      key={`${l.id ?? `${d.val}-${i}`}`}
                      className="absolute rounded-lg border text-xs sm:text-sm overflow-hidden"
                      title={`${subj} ${getStart(l)}–${getEnd(l)}${degree ? ` • ${degree}` : ""}${room ? ` • ${room}` : ""}${conflict ? " • CONFLICT" : ""}`}
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${widthPct}% - 8px)`,
                        backgroundColor: c.bg,
                        borderColor,
                        boxShadow: `0 6px 16px ${accent}33`,
                      }}
                    >
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                        <span className="font-medium text-foreground truncate">{subj}</span>
                      </div>
                      <div className="px-2 pb-1 text-[11px] text-muted-foreground truncate">
                        {getStart(l)}–{getEnd(l)}
                        {degree ? ` • ${degree}` : ""}
                        {room ? ` • ${room}` : ""}
                        {conflict ? " • conflict" : ""}
                      </div>
                    </div>
                  );
                })
              )}

              {/* filler for height */}
              <div style={{ height: `${rangeMins}px` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== VIEW: AGENDA ===================== */

function AgendaList({ lessons, weekOffset }) {
  const monday = useMemo(
    () => startOfWeekMonday(addDays(new Date(), weekOffset * 7)),
    [weekOffset]
  );

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      const day = Number(l.day_of_week);
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (toMins(getStart(a)) ?? 0) - (toMins(getStart(b)) ?? 0));
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
                  const c = subjectColors(l.subject?.id ?? l.subject_id, "chip");
                  const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "";
                  const room = l.room?.name ?? l.room ?? "";
                  return (
                    <div
                      key={l.id ?? `${d.val}-${i}`}
                      className="rounded-xl border p-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {l.subject?.id || l.subject_id ? (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{ background: c.bg, color: "#fff", border: `1px solid ${c.border}` }}
                          >
                            {l.subject?.name ?? "Matière"}
                          </span>
                        ) : (
                          l.subject?.name ?? "—"
                        )}
                        <span className="text-muted-foreground">
                          {getStart(l) && getEnd(l)
                            ? `(${getStart(l)}–${getEnd(l)})`
                            : l.period
                            ? `• Period ${l.period}`
                            : ""}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {degree ? degree : ""}{room ? ` • ${room}` : ""}
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
      const dow = Number(l.day_of_week); // 1..7
      if (!dow) continue;
      const dayIdx = dow === 7 ? 6 : dow - 1;
      const date = addDays(monday, dayIdx);
      const [sh, sm] = String(getStart(l) ?? "00:00").split(":").map(Number);
      const [eh, em] = String(getEnd(l)   ?? "00:00").split(":").map(Number);
      const start = new Date(date); start.setHours(sh || 0, sm || 0, 0, 0);
      const end   = new Date(date); end.setHours(eh || 0, em || 0, 0, 0);

      const degree = l.timetable?.degree?.name ?? l.degree?.name ?? "";
      const subj = l.subject?.name ?? "Lesson";
      const room = l.room?.name ?? l.room ?? "";

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start, end,
        title: degree ? `${subj} • ${degree}` : subj,
        location: room,
        desc: degree ? `Niveau: ${degree}` : "",
      });
    }
    const ics = buildIcs(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enseignant-emploi du temps.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
      Export .ics
    </button>
  );
}
