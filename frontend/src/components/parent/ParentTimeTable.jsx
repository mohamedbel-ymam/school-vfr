// src/components/parent/ParentTimetable.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../api/axios";

/* ───────────────────────────── Helpers & constants ───────────────────────────── */
const DAYS = [
  { label: "Lun", full: "Lundi",    val: 1 },
  { label: "Mar", full: "Mardi",    val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi",    val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi",   val: 6 },
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
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const sameMonday = (a, b) => startOfWeekMonday(a).getTime() === startOfWeekMonday(b).getTime();
const isSameDayIndex = (date, dow1to7) => { const js = date.getDay(); const ours = js === 0 ? 7 : js; return ours === dow1to7; };
const inWeek = (date, monday) => {
  const start = new Date(monday), end = addDays(monday, 6);
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return date >= start && date <= end;
};

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
const toMins = (hhmm) => { const s = parseTimeLike(hhmm); if (!s) return null; const [h,m]=s.split(":").map(Number); return h*60+m; };

const pickFirst = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const getStartRaw = (l) => pickFirst(l?.start, l?.start_time, l?.starts_at, l?.from, l?.hour_from, l?.begin, l?.time_from) ?? null;
const getEndRaw   = (l) => pickFirst(l?.end,   l?.end_time,   l?.ends_at,   l?.to,   l?.hour_to,   l?.finish, l?.time_to)   ?? null;

const numOrNull = (v) => { if (v === 0 || v === "0") return 0; if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

const SCHOOL_START_MINS = 9 * 60;   // 09:00
const PERIOD_DURATION_MINS = 90;    // 1h30
const parsePeriodToMins = (period) => {
  if (!period && period !== 0) return null;
  const s = String(period).trim();
  let m = s.match(/(\d{1,2}[:h.]\d{0,2})\s*[-–—àto]+\s*(\d{1,2}[:h.]\d{0,2})/i);
  if (m) {
    const sm = toMins(m[1]), em = toMins(m[2]);
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
  const sm = numOrNull(row?.start_minutes) ?? toMins(getStartRaw(row));
  const em = numOrNull(row?.end_minutes)   ?? toMins(getEndRaw(row));
  if (sm != null && em != null && em > sm) return [sm, em];
  const p = parsePeriodToMins(row?.period);
  if (p) return p;
  return null;
};

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

// subjects (stable, distinct hues)
const slugify = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const subjectKey = (l) =>
  l?.subject?.key ??
  l?.subject?.id ??
  l?.subject_id ??
  slugify(l?.subject?.name ?? l?.subject_name ?? "subject");
const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const hueForKey = (key) => (hash(String(key)) * 137.508) % 360;
const subjectChip = (key) => {
  const h = hueForKey(key);
  return {
    bg: `hsl(${h} 70% 45%)`,
    text: "#fff",
    border: `hsl(${h} 65% 40%)`,
    soft: `hsl(${h} 85% 45% / 0.12)`,
  };
};

const teacherName = (t) => (t ? `${t.firstname ?? ""} ${t.lastname ?? ""}`.trim() : "");

// unwrap helpers
const unwrapChildren = (r) => r?.data?.data ?? r?.data?.children ?? r?.data ?? [];
const unwrapLessons = (r) =>
  r?.data?.data?.lessons ??
  r?.data?.lessons ??
  (Array.isArray(r?.data?.data) ? r.data.data : r?.data ?? []);
const unwrapPlans = (r) => r?.data?.data ?? r?.data ?? [];

/* ICS */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const buildIcs = (events) => {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Takwa Etablissement//Parent Emploi du temps//EN"];
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
const PARENT_TIMETABLE_ENDPOINT = "/parent/emploi-du-temps";
const SUBJECT_ENDPOINT_CANDIDATES = ["/admin/subjects", "/parent/subjects", "/subjects", "/eleve/subjects"];
const PLANS_ENDPOINT_CANDIDATES = ["/parent/monthly-plans", "/eleve/monthly-plans"];

// Fetch week (with TimeTableApi.parent if available)
const fetchParentWeek = async ({ child_id, week_start }) => {
  if (TimeTableApi?.parent) return TimeTableApi.parent({ child_id, week_start });
  return axiosClient.get(PARENT_TIMETABLE_ENDPOINT, { params: { child_id, week_start } });
};

async function fetchSubjectCatalog() {
  for (const url of SUBJECT_ENDPOINT_CANDIDATES) {
    try {
      const res = await axiosClient.get(url, { params: { per_page: 1000 } });
      const arr = res?.data?.data ?? res?.data ?? [];
      if (Array.isArray(arr) && arr.length) {
        const map = {};
        for (const it of arr) {
          const id = String(it?.id ?? it?.value ?? "");
          const name = it?.name ?? it?.title ?? it?.label ?? (id ? `#${id}` : "Matière");
          const key = it?.key ?? it?.code ?? undefined;
          if (id) map[id] = { name, key };
        }
        return map;
      }
    } catch { /* try next */ }
  }
  return {};
}

async function fetchPlansForWeek({ child_id, months }) {
  const results = [];
  for (const base of PLANS_ENDPOINT_CANDIDATES) {
    try {
      const pages = await Promise.all(
        months.map((month) => axiosClient.get(base, { params: { month, child_id } }))
      );
      results.push(...pages.flatMap((p) => unwrapPlans(p)));
      if (results.length) break; // got some, stop trying fallbacks
    } catch { /* try next endpoint */ }
  }
  return results;
}

function decorateSubject(l, catalog) {
  const subjId = l?.subject?.id ?? l?.subject_id ?? null;
  const subjName = l?.subject?.name ?? l?.subject_name ?? null;
  const subjKey = l?.subject?.key ?? l?.subject_key ?? null;

  if (subjName) {
    return { id: subjId ?? null, name: subjName, key: subjKey ?? subjId ?? slugify(subjName) };
  }
  if (subjId != null && catalog[String(subjId)]) {
    const c = catalog[String(subjId)];
    return { id: subjId, name: c.name, key: c.key ?? subjId };
  }
  if (subjId != null) return { id: subjId, name: `Matière #${subjId}`, key: subjId };
  return { id: null, name: "Matière", key: slugify("Matière") };
}

/* ───────────────────────────── Component ───────────────────────────── */
export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [timetableTitle, setTimetableTitle] = useState("");

  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "agenda" : "grid"
  );

  const [lessons, setLessons] = useState([]);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [subjectFilter, setSubjectFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [loadingChild, setLoadingChild] = useState(false);
  const [err, setErr] = useState("");

  // responsive view
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
  const mondayIso = useMemo(() => `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`, [monday]);
  const monthsForWeek = useMemo(() => {
    const m1 = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}`;
    const m2 = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}`;
    return m1 === m2 ? [m1] : [m1, m2];
  }, [monday, sunday]);

  // Load linked children
  useEffect(() => {
    (async () => {
      try {
        const res = await axiosClient.get("/parent/children", { params: { per_page: 200 } });
        const kids = unwrapChildren(res);
        setChildren(kids);
        if (kids.length) setChildId(String(kids[0].id));
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Impossible de charger les enfants");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load timetable for selected child & visible week + subject catalog + monthly plans
  useEffect(() => {
    if (!childId) return;
    let mounted = true;
    (async () => {
      setLoadingChild(true);
      try {
        const [weekRes, catalogRes] = await Promise.allSettled([
          fetchParentWeek({ child_id: childId, week_start: mondayIso }),
          fetchSubjectCatalog(),
        ]);
        const catalog = catalogRes.status === "fulfilled" ? (catalogRes.value || {}) : {};
        if (mounted) setSubjectCatalog(catalog);

        const weeklyRaw = weekRes.status === "fulfilled" ? unwrapLessons(weekRes.value) : [];
        let title = "";
        if (weekRes.status === "fulfilled") {
          const p = weekRes.value?.data ?? weekRes.value;
          title = p?.timetable?.title ?? p?.data?.timetable?.title ?? "";
        }

        const weekly = (weeklyRaw ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
          start_time: getStartRaw(l),
          end_time: getEndRaw(l),
          start_minutes: numOrNull(l?.start_minutes) ?? undefined,
          end_minutes: numOrNull(l?.end_minutes) ?? undefined,
          subject: decorateSubject(l, catalog),
          room: l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : null),
          teacher: l?.teacher ?? l?.prof ?? null,
          is_plan: false,
          plan_date: null,
          week_start: l?.week_start ?? l?.weekStart ?? mondayIso,
        }));

        // monthly plans overlapping visible week
        const rawPlans = await fetchPlansForWeek({ child_id: childId, months: monthsForWeek });
        const plansInWeek = (rawPlans ?? []).filter((p) => {
          const d = new Date(`${p?.plan_date}T00:00:00`);
          return !Number.isNaN(d) && inWeek(d, monday);
        });

        const plans = plansInWeek.map((p) => {
          const subjId = p?.subject?.id ?? p?.subject_id ?? null;
          const subjName = p?.subject?.name ?? (subjId != null ? catalog[String(subjId)]?.name : null);
          const normalizedSubject = subjName
            ? { id: subjId, name: subjName, key: subjId ?? slugify(subjName) }
            : p?.subject
            ? { id: p.subject.id ?? null, name: p.subject.name ?? "Matière", key: p.subject.key ?? p.subject.id }
            : null;

          return {
            id: p.id,
            is_plan: true,
            plan_date: p.plan_date, // YYYY-MM-DD
            subject: normalizedSubject,
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
            teacher: null,
          };
        });

        if (!mounted) return;
        setLessons([...weekly, ...plans]);
        setTimetableTitle(title);
        setErr("");
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.response?.data?.message || "Échec du chargement de l’emploi du temps");
      } finally {
        if (mounted) setLoadingChild(false);
      }
    })();
    return () => { mounted = false; };
  }, [childId, mondayIso, monthsForWeek, monday]);

  const currentChild = useMemo(
    () => children.find((c) => String(c.id) === String(childId)) || null,
    [children, childId]
  );
  const childLabel = (c) => (c ? `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || c.name || `#${c.id}` : "");

  // Subjects legend
  const subjects = useMemo(() => {
    const s = new Map();
    for (const l of lessons ?? []) {
      const key = subjectKey(l);
      const name = l?.subject?.name ?? l?.subject_name ?? "Matière";
      s.set(String(key), name);
    }
    return [...s.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const plans = useMemo(() => {
    const p = new Map();
    for (const l of lessons ?? []) {
      const pid = l?.timetable_id;
      if (pid != null) p.set(String(pid), l?.timetable?.title ?? `Plan #${pid}`);
    }
    return [...p.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  const shown = useMemo(() => {
    return (lessons ?? []).filter((l) => {
      const okSubject = !subjectFilter || String(subjectKey(l)) === String(subjectFilter);
      const okPlan = planFilter === "all" || String(l?.timetable_id) === String(planFilter);
      return okSubject && okPlan;
    });
  }, [lessons, subjectFilter, planFilter]);

  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!children.length) return <div className="p-4 text-center">Aucun enfant lié.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">
            {timetableTitle || `Emploi du temps de ${childLabel(currentChild)}`}
          </div>
          <ToolbarSubtitle weekOffset={weekOffset} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Enfant :</label>
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background text-foreground"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {childLabel(c)}
              </option>
            ))}
          </select>

          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60"
            >
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

          <IcsButton
            childName={childLabel(currentChild)}
            lessons={shown}
            monday={monday}
          />

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60"
          >
            Imprimer
          </button>

          {loadingChild && <span className="text-xs text-muted-foreground">Chargement…</span>}
        </div>
      </div>

      {/* Legend */}
      {!!subjects.length && (
        <div className="flex flex-wrap gap-2 text-xs">
          {subjects.map((s) => {
            const c = subjectChip(s.id);
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
      )}

      {/* Content */}
      {view === "grid" ? (
        <WeekGrid lessons={shown} monday={monday} weekOffset={weekOffset} />
      ) : (
        <AgendaList lessons={shown} monday={monday} />
      )}

      <BackToThisWeekFab show={weekOffset !== 0} onClick={() => setWeekOffset(0)} />
    </div>
  );
}

/* ───────────────────────────── UI bits ───────────────────────────── */
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

/* ───────────────────────────── Grid (like student) ───────────────────────────── */
const HARD_MIN = 7 * 60;
const HARD_MAX = 22 * 60;
const PAD_MINS = 30;

function WeekGrid({ lessons, monday, weekOffset }) {
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
      for (const l of byDay.get(d.val) ?? []) {
        const mins = resolveStartEndMins(l);
        if (!mins) continue;
        min = Math.min(min, mins[0]);
        max = Math.max(max, mins[1]);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { min = 9 * 60; max = 12 * 60; }
    let minAdj = Math.floor((min - PAD_MINS) / 30) * 30;
    let maxAdj = Math.ceil((max + PAD_MINS) / 30) * 30;
    minAdj = clamp(minAdj, HARD_MIN, HARD_MAX - 30);
    maxAdj = clamp(maxAdj, minAdj + 60, HARD_MAX);
    return { minM: minAdj, maxM: maxAdj };
  }, [byDay]);
  const range = maxM - minM;

  const lanesByDay = useMemo(() => {
    const out = new Map();
    const UNT_SLOT = 30;
    for (const d of DAYS) {
      const items = byDay.get(d.val) ?? [];
      const timed = [], untimed = [];
      for (const l of items) {
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

  const hourMarks = useMemo(() => { const arr = []; for (let m = minM; m <= maxM; m += 60) arr.push({ h: Math.floor(m / 60), m }); return arr; }, [minM, maxM]);
  const halfHourMarks = useMemo(() => { const arr = []; for (let m = minM + 30; m < maxM; m += 60) arr.push(m); return arr; }, [minM, maxM]);

  const hasAny = useMemo(() => DAYS.some((d) => (byDay.get(d.val) ?? []).length), [byDay]);
  if (!hasAny) return <div className="rounded-md border p-3 text-sm text-muted-foreground">Aucune séance pour cette semaine.</div>;

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

                      const subjName = l?.subject?.name ?? l?.subject_name ?? "Matière";
                      const key = subjectKey(l);
                      const chip = subjectChip(key);
                      const tName = teacherName(l?.teacher);
                      const room = l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");
                      const sText = parseTimeLike(getStartRaw(l));
                      const eText = parseTimeLike(getEndRaw(l));

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className={`absolute rounded-lg text-[11px] sm:text-sm overflow-hidden ${synthetic ? "ring-1 ring-white/60" : ""}`}
                          title={`${subjName}${room ? ` • ${room}` : ""}${sText && eText ? ` (${sText}–${eText})` : ""}${tName ? ` • ${tName}` : ""}`}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                            backgroundColor: chip.bg,
                            color: chip.text,
                            boxShadow: `0 6px 14px rgba(0,0,0,0.18)`,
                            opacity: synthetic ? 0.9 : 1,
                          }}
                        >
                          <div className="px-2 pt-1 font-semibold leading-tight truncate">{subjName}</div>
                          <div className="px-2 text-[10px] sm:text-[11px] leading-tight">
                            {sText && eText ? `${sText}–${eText}` : (synthetic ? "Sans horaire" : "")}
                          </div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] leading-tight truncate">
                            {[room, tName].filter(Boolean).join(" • ")}
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

/* ───────────────────────────── Agenda ───────────────────────────── */
function AgendaList({ lessons, monday }) {
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
        day = normalizeDow(l?.day_of_week);
      }
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
                  const chip = subjectChip(key);
                  const subj = l?.subject?.name ?? l?.subject_name ?? "Matière";
                  const tName = teacherName(l?.teacher);
                  const room = l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

                  const mins = resolveStartEndMins(l);
                  const timeStr = mins
                    ? `(${pad(Math.floor(mins[0] / 60))}:${pad(mins[0] % 60)}–${pad(Math.floor(mins[1] / 60))}:${pad(mins[1] % 60)})`
                    : (l?.period ? `(Créneau ${l.period})` : "");

                  return (
                    <div key={l.id ?? `${d.val}-${i}`} className="rounded-xl border p-3 bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ background: chip.bg, color: chip.text, border: `1px solid ${chip.border}` }}
                        >
                          {subj}
                        </span>
                        {timeStr ? <span className="text-muted-foreground">{timeStr}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tName ? `Par ${tName}` : ""}{room ? ` • ${room}` : ""}
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

/* ───────────────────────────── ICS export ───────────────────────────── */
function IcsButton({ childName, lessons, monday }) {
  const download = () => {
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
      const tName = teacherName(l?.teacher);
      const room = l?.room?.name ?? l?.room ?? "";

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start, end,
        title: childName ? `${childName} • ${subj}` : subj,
        location: room,
        desc: [tName ? `Par ${tName}` : "", room ? `Salle: ${room}` : ""].filter(Boolean).join("\\n"),
      });
    }
    const ics = buildIcs(events);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (childName ? `${childName.replace(/\s+/g, "_").toLowerCase()}-agenda` : "child-agenda") + ".ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">Export .ics</button>;
}
