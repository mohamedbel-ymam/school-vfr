// src/components/parent/ParentTimetable.jsx
import { useEffect, useMemo, useState } from "react";
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

// tolerant field access
const pickFirst = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const getStartRaw = (l) => pickFirst(l?.start, l?.start_time, l?.starts_at, l?.from, l?.hour_from, l?.begin, l?.time_from) ?? null;
const getEndRaw   = (l) => pickFirst(l?.end,   l?.end_time,   l?.ends_at,   l?.to,   l?.hour_to,   l?.finish, l?.time_to)   ?? null;

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
  const s = toMins(getStartRaw(row));
  const e = toMins(getEndRaw(row));
  if (s != null && e != null && e > s) return [s, e];
  const p = parsePeriodToMins(row?.period);
  if (p) return p;
  return null;
};

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
const unwrapPayload  = (r) =>
  r?.data?.data ??
  r?.data ??
  null;

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

/* ───────────────────────────── Component ───────────────────────────── */
export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [timetableTitle, setTimetableTitle] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChild, setLoadingChild] = useState(false);
  const [err, setErr] = useState("");

  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const mondayIso = useMemo(() => `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`, [monday]);

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

  // Load timetable for selected child & visible week
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingChild(true);
      try {
        const params = { child_id: childId, week_start: mondayIso };
        const res =
          (TimeTableApi?.parent && (await TimeTableApi.parent(params))) ||
          (await axiosClient.get("/parent/emploi-du-temps", { params }));

        const payload = unwrapPayload(res);

        // Normalize: support {lessons, timetable} or array
        let rows = [];
        let title = "";
        if (Array.isArray(payload)) {
          rows = payload;
        } else {
          rows = payload?.lessons ?? payload?.data ?? [];
          title = payload?.timetable?.title ?? "";
        }

        // Normalize each row (day_of_week, times, subject/room/teacher)
        const normalized = (rows ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
          start_time: getStartRaw(l),
          end_time: getEndRaw(l),
          subject: l?.subject?.name || l?.subject_name ? { id: l?.subject?.id ?? l?.subject_id, name: l?.subject?.name ?? l?.subject_name } : l?.subject,
          room: l?.room?.name || l?.room ? (l?.room?.name ?? l?.room) : (l?.room_id ? `Salle #${l.room_id}` : null),
          teacher: l?.teacher ?? l?.prof ?? null,
        }));

        setLessons(normalized);
        setTimetableTitle(title);
        setErr("");
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Échec du chargement de l’emploi du temps");
      } finally {
        setLoadingChild(false);
      }
    })();
  }, [childId, mondayIso]);

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

          <IcsButton
            childName={childLabel(currentChild)}
            lessons={lessons}
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

      {/* Agenda list */}
      <AgendaList lessons={lessons} monday={monday} />
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

/* ───────────────────────────── Agenda ───────────────────────────── */
function AgendaList({ lessons, monday }) {
  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      const day = normalizeDow(l?.day_of_week);
      if (!day) continue;
      m.get(day)?.push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (toMins(getStartRaw(a)) ?? 0) - (toMins(getStartRaw(b)) ?? 0));
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
