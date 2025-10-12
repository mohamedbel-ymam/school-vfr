// src/components/parent/ParentTimetable.jsx
import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../api/axios";

/* ---------------- helpers ---------------- */

const unwrapChildren = (r) =>
  r?.data?.data ?? r?.data?.children ?? r?.data ?? [];

const unwrapPayload = (r) => r?.data?.data ?? r?.data ?? null;

const getStartRaw = (l) => l?.start_time ?? l?.starts_at ?? null;
const getEndRaw   = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const teacherName = (t) =>
  t ? `${t.firstname ?? ""} ${t.lastname ?? ""}`.trim() : "";

/* Days (Mon-first) */
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

/** Accepts: "19", "19:30", "19:30:00", "19h30", "19.30" → "HH:MM" */
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

/* Golden-angle color per subject (stable & distinct) */
const subjectKey = (l) =>
  l?.subject?.id ?? l?.subject_id ?? l?.subject?.name ?? "subject";
const hueForSubject = (key) => (Number(key || 0) * 137) % 360;
const subjectColors = (key, variant = "chip") => {
  const hue = hueForSubject(key);
  if (variant === "chip") {
    return {
      bg: `hsl(${hue}, 70%, 45%)`,
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

/* Period fallback (when only "period" is given) */
const SCHOOL_START_MINS = 9 * 60; // 09:00
const PERIOD_DURATION_MINS = 90;  // 1h30
// Accept "1", "P1", "08:00-09:30", "08h00–09h30"
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
const resolveStartEndMins = (row) => {
  const s = toMins(getStartRaw(row));
  const e = toMins(getEndRaw(row));
  if (s != null && e != null && e > s) return [s, e];
  const p = parsePeriodToMins(row?.period);
  if (p) return p;
  return null;
};

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay(); // 0 Sun..6 Sat
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

/* ---------- ICS export ---------- */
const toIcsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}00Z`;
const buildIcs = (events) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Takwa Etablissement//Parent Emploi du temps//EN",
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

/* ================= Parent Timetable (Agenda only) ================= */

export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId]   = useState("");
  const [timetable, setTimetable] = useState(null);
  const [lessons, setLessons]     = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const [loading, setLoading]           = useState(true);
  const [loadingChild, setLoadingChild] = useState(false);
  const [err, setErr] = useState("");

  // 1) Load linked children
  useEffect(() => {
    (async () => {
      try {
        // Adjust endpoint if your backend differs
        const res = await axiosClient.get("/parent/children", { params: { per_page: 200 } });
        const kids = unwrapChildren(res);
        setChildren(kids);
        if (kids.length) setChildId(String(kids[0].id));
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load children");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) Load timetable for selected child
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingChild(true);
      try {
        const res =
          (TimeTableApi.parent && (await TimeTableApi.parent({ child_id: childId }))) ||
          (TimeTableApi.student && (await TimeTableApi.student({ child_id: childId })));
        const payload = unwrapPayload(res);

        if (Array.isArray(payload)) {
          setLessons(payload);
          setTimetable(payload[0]?.timetable ?? null);
        } else {
          setLessons(payload?.lessons ?? payload?.data ?? []);
          setTimetable(payload?.timetable ?? null);
        }
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load emploi du temps");
      } finally {
        setLoadingChild(false);
      }
    })();
  }, [childId]);

  const currentChild = useMemo(
    () => children.find((c) => String(c.id) === String(childId)) || null,
    [children, childId]
  );
  const childLabel = (c) =>
    c ? `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || c.name || `#${c.id}` : "";

  // Legend subjects (for chips)
  const subjects = useMemo(() => {
    const s = new Map();
    for (const l of lessons ?? []) {
      const key = subjectKey(l);
      const name = l?.subject?.name ?? "Matière";
      s.set(String(key), name);
    }
    return [...s.entries()].map(([id, name]) => ({ id, name }));
  }, [lessons]);

  if (loading) return <div className="p-4 text-center">Loading…</div>;
  if (err) return <div className="p-4 text-center text-red-600 dark:text-red-400">{err}</div>;
  if (!children.length) return <div className="p-4 text-center">No linked students found.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Child selector + toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xl font-semibold">
            {timetable?.title ? timetable.title : `Emploi du temps de ${childLabel(currentChild)}`}
          </div>
          <ToolbarSubtitle weekOffset={weekOffset} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Choisir l’enfant :</label>
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
            weekOffset={weekOffset}
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

      {/* Legend (subjects) */}
      {!!subjects.length && (
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
      )}

      {/* Agenda (Subject + Teacher + Room) */}
      <AgendaList lessons={lessons} weekOffset={weekOffset} />
    </div>
  );
}

/* ---------------- UI bits ---------------- */

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

/* ---------------- Agenda ---------------- */

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
      arr.sort((a, b) => (toMins(getStartRaw(a)) ?? 0) - (toMins(getStartRaw(b)) ?? 0));
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
                  const col = subjectColors(key, "chip");
                  const subj = l.subject?.name ?? l.subject_name ?? "Matière";
                  const tName = teacherName(l.teacher);
                  const room = l.room?.name ?? l.room ?? (l.room_id ? `Salle #${l.room_id}` : "");

                  const mins = resolveStartEndMins(l);
                  const timeStr = mins
                    ? `(${pad(Math.floor(mins[0] / 60))}:${pad(mins[0] % 60)}–${pad(Math.floor(mins[1] / 60))}:${pad(mins[1] % 60)})`
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
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}
                        >
                          {subj}
                        </span>
                        <span className="text-muted-foreground">{timeStr}</span>
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

/* ---------------- ICS export ---------------- */

function IcsButton({ childName, lessons, weekOffset }) {
  const download = () => {
    const monday = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const events = [];

    for (const l of lessons ?? []) {
      const dow = Number(l.day_of_week); // 1..7
      if (!dow) continue;
      const date = addDays(monday, dow - 1);

      const mins = resolveStartEndMins(l);
      if (!mins) continue;

      const start = new Date(date);
      const end   = new Date(date);
      start.setHours(Math.floor(mins[0] / 60), mins[0] % 60, 0, 0);
      end.setHours(Math.floor(mins[1] / 60), mins[1] % 60, 0, 0);

      const subj = l.subject?.name ?? l.subject_name ?? "Séance";
      const tName = teacherName(l.teacher);
      const room = l.room?.name ?? l.room ?? "";

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start,
        end,
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
    a.download = childName
      ? `${childName.replace(/\s+/g, "_").toLowerCase()}-agenda.ics`
      : "child-agenda.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={download} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
      Export .ics
    </button>
  );
}
