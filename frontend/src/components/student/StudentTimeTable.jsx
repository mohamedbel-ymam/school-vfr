// src/components/student/StudentTimeTable.jsx
import { useEffect, useMemo, useState } from "react";
import TimetableApi from "../../services/api/admin/TimeTableApi";

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

const SCHOOL_START_MINS    = 9 * 60;   // 09:00 — adaptez si besoin
const SCHOOL_END_MINS      = 22 * 60;  // 22:00
const PERIOD_DURATION_MINS = 60;       // fallback quand seule "period" est fournie

/* ---------------------------------- Helpers ----------------------------------- */
const unwrap = (r) => r?.data?.data ?? r?.data ?? null;

const getStartRaw = (l) => l?.start_time ?? l?.starts_at ?? null;
const getEndRaw   = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const pad = (n) => String(n).padStart(2, "0");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const parseTimeLike = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim();
  // 09:00:00 / 9:00 / 9:0
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return `${pad(+m[1])}:${pad(+m[2])}`;
  // 09h00 / 9h
  m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (m) return `${pad(+m[1])}:${pad(+(m[2] ?? 0))}`;
  // 9.30
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${pad(+m[1])}:${pad(+m[2])}`;
  // 9 → HH:00
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

// Couleurs par matière (clé stable)
const HUES = [210, 260, 330, 0, 30, 120, 160];
const hashStr = (s) => Array.from(String(s)).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
const subjectKey = (l) => l?.subject?.id ?? l?.subject_id ?? l?.subject?.name ?? "subject";
const subjectHue = (key) => {
  const n = typeof key === "number" ? key : Math.abs(hashStr(key));
  return HUES[(n + 7) % HUES.length];
};
const subjectColors = (key, variant = "block") => {
  const hue = subjectHue(key);
  if (variant === "chip") {
    return {
      bg: `hsl(${hue}, 85%, 45%)`,
      text: "#fff",
      border: `hsl(${hue}, 65%, 40%)`,
      softBg: `hsla(${hue}, 85%, 45%, 0.12)`,
    };
  }
  return {
    bg: `hsla(${hue}, 85%, 45%, 0.18)`,
    border: `hsl(${hue}, 65%, 45%)`,
    accent: `hsl(${hue}, 85%, 45%)`,
  };
};

const teacherName = (t, id) =>
  t ? `${t.firstname ?? ""} ${t.lastname ?? ""}`.trim() : (id ? `Enseignant #${id}` : "");

// period → [startMins, endMins]
const parsePeriodToMins = (period) => {
  if (!period) return null;
  const s = String(period).trim();

  // "08:00-09:00" / "08h00–09h00"
  let m = s.match(/(\d{1,2}[:h.]\d{0,2})\s*[-–—àto]+\s*(\d{1,2}[:h.]\d{0,2})/i);
  if (m) {
    const sm = toMins(m[1]);
    const em = toMins(m[2]);
    if (sm != null && em != null && em > sm) return [sm, em];
  }

  // Étiquette numérique: "P1", "1", "1ère"
  m = s.match(/(\d{1,2})/);
  if (m) {
    const idx = Math.max(1, Math.min(20, parseInt(m[1], 10))); // 1..20
    const start = SCHOOL_START_MINS + (idx - 1) * PERIOD_DURATION_MINS;
    const end = start + PERIOD_DURATION_MINS;
    return [start, end];
  }

  return null;
};

// Choisir les minutes pour une ligne
const resolveStartEndMins = (row) => {
  const s = toMins(getStartRaw(row));
  const e = toMins(getEndRaw(row));
  if (s != null && e != null && e > s) return [s, e];

  const p = parsePeriodToMins(row?.period);
  if (p) return p;

  return null; // rien à afficher sur la grille
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
  const [nowTopPct, setNowTopPct] = useState(0);

  // position de la ligne "maintenant"
  useEffect(() => {
    const minM = SCHOOL_START_MINS,
      range = SCHOOL_END_MINS - SCHOOL_START_MINS;
    const tick = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setNowTopPct(clamp((mins - minM) / range, 0, 1) * 100);
    };
    tick();
    const t = setInterval(tick, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // chargement des données
  useEffect(() => {
    (async () => {
      try {
        const res = await TimetableApi.student(); // GET timetable élève
        const payload = unwrap(res);

        const raw = Array.isArray(payload)
          ? payload
          : payload?.lessons ?? payload?.data ?? [];

        const normalized = (raw ?? []).map((l) => ({
          ...l,
          day_of_week: Number(l?.day_of_week ?? l?.dow ?? l?.day ?? 0),
          subject:
            l?.subject?.id || l?.subject_id
              ? {
                  id: l.subject?.id ?? l.subject_id,
                  name: l.subject?.name ?? l.subject_name ?? "Matière",
                }
              : l?.subject?.name
              ? { id: null, name: l.subject.name }
              : l?.subject,
          teacher: l?.teacher ?? (l?.teacher_id ? null : undefined),
          room: l?.room ?? (l?.room_id ? null : undefined),
          timetable_id: l?.timetable_id ?? l?.plan_id ?? l?.timetable?.id ?? null,
          timetable: l?.timetable ?? (l?.plan ? { id: l.plan.id, title: l.plan.title } : null),
          start_time: getStartRaw(l),
          end_time: getEndRaw(l),
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

  // listes pour les filtres
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
        <WeekGrid lessons={shownLessons} weekOffset={weekOffset} nowTopPct={nowTopPct} />
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
        const c = subjectColors(s.id, "chip");
        return (
          <span
            key={s.id}
            className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-2 py-0.5 border"
            style={{ borderColor: c.border, background: c.softBg }}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: c.bg }} />
            <span className="text-foreground/80">{s.name}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ----------------------------- Grille hebdomadaire ---------------------------- */
function WeekGrid({ lessons, weekOffset, nowTopPct }) {
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
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

  const minM = SCHOOL_START_MINS,
    maxM = SCHOOL_END_MINS,
    range = maxM - minM;

  // Empilement par "voies" pour éviter les collisions
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
    for (let m = minM; m <= maxM; m += 60) {
      const h = Math.floor(m / 60);
      arr.push({ h, m });
    }
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
              const isToday = isSameDayIndex(new Date(), d.val) && weekOffset === 0;
              return (
                <div key={d.val} className="relative border-l bg-background/50">
                  {/* lignes d’heures */}
                  {hourMarks.map(({ m }) => {
                    const pct = ((m - minM) / range) * 100;
                    return <div key={m} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
                  })}

                  {/* ligne "maintenant" */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 h-[2px] bg-primary/70 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                      style={{ top: `${nowTopPct}%` }}
                    />
                  )}

                  {/* séances */}
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
                      const c = subjectColors(subjectKey(l), "block");
                      const tName = teacherName(l.teacher, l.teacher_id);
                      const rName = l.room?.name ?? l.room ?? (l.room_id ? `Salle #${l.room_id}` : "");

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className="absolute rounded-lg border text-[11px] sm:text-sm overflow-hidden"
                          title={`${subjName} ${parseTimeLike(getStartRaw(l)) ?? ""}${
                            getEndRaw(l) ? `–${parseTimeLike(getEndRaw(l))}` : ""
                          }${rName ? ` • ${rName}` : ""}${tName ? ` • ${tName}` : ""}`}
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
                            <span className="font-medium text-foreground truncate">{subjName}</span>
                          </div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] text-muted-foreground truncate">
                            {parseTimeLike(getStartRaw(l)) && parseTimeLike(getEndRaw(l))
                              ? `${parseTimeLike(getStartRaw(l))}–${parseTimeLike(getEndRaw(l))}`
                              : l.period
                              ? `Créneau ${l.period}`
                              : ""}
                            {tName ? ` • ${tName}` : ""}
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
                  const c = subjectColors(subjectKey(l), "chip");
                  const tName = teacherName(l.teacher, l.teacher_id);
                  const rName = l.room?.name ?? l.room ?? (l.room_id ? `Salle #${l.room_id}` : "");
                  const times = resolveStartEndMins(l);
                  const timeStr = times
                    ? `(${pad(Math.floor(times[0] / 60))}:${pad(times[0] % 60)}–${pad(Math.floor(times[1] / 60))}:${pad(
                        times[1] % 60
                      )})`
                    : l.period
                    ? `• Créneau ${l.period}`
                    : "";

                  return (
                    <div
                      key={l.id ?? `${d.val}-${i}`}
                      className="rounded-xl border p-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xl font-medium"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                        >
                          {l?.subject?.name ?? l?.subject_name ?? "Matière"}
                        </span>
                        <span className="text-muted-foreground">{timeStr}</span>
                      </div>
                      <div className="text-black dark:text-white">
                        {tName ? `Par ${tName}` : ""}
                        {rName ? ` • ${rName}` : ""}
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

/* --------------------------------- Export ICS --------------------------------- */
function IcsButton({ lessons, weekOffset }) {
  const download = () => {
    const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const events = [];
    for (const l of lessons ?? []) {
      const dow = Number(l.day_of_week);
      if (!dow) continue;
      const date = addDays(monday, dow - 1); // 1→0, …, 7→6
      const mins = resolveStartEndMins(l);
      const start = new Date(date),
        end = new Date(date);
      if (mins) {
        start.setHours(Math.floor(mins[0] / 60), mins[0] % 60, 0, 0);
        end.setHours(Math.floor(mins[1] / 60), mins[1] % 60, 0, 0);
      }
      const subj = l?.subject?.name ?? l?.subject_name ?? "Séance";
      const room = l.room?.name ?? l.room ?? (l.room_id ? `Salle #${l.room_id}` : "");
      const teacher = teacherName(l.teacher, l.teacher_id);

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start,
        end,
        title: subj,
        location: room,
        desc: teacher ? `Par ${teacher}` : "",
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
