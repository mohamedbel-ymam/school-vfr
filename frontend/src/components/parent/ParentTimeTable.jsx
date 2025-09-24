import { useEffect, useMemo, useState } from "react";
import TimetableApi from "../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../api/axios";

/* ---------------- helpers ---------------- */

const unwrapChildren = (r) =>
  r?.data?.data ?? r?.data?.children ?? r?.data ?? [];

const unwrapPayload = (r) => r?.data?.data ?? r?.data ?? null;

const getStart = (l) => l?.start_time ?? l?.starts_at ?? null; // "HH:mm"
const getEnd   = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const teacherName = (t) =>
  t ? `${t.firstname ?? ""} ${t.lastname ?? ""}`.trim() : "";

const DAYS = [
  { label: "Lun", full: "Monday",    val: 1 },
  { label: "Mar", full: "Tuesday",   val: 2 },
  { label: "Mer", full: "Wednesday", val: 3 },
  { label: "Jeu", full: "Thursday",  val: 4 },
  { label: "Ven", full: "Friday",    val: 5 },
  { label: "Sam", full: "Saturday",  val: 6 },
  { label: "Dim", full: "Sunday",    val: 7 },
];

const HUES = [210, 260, 330, 0, 30, 120, 160];
const subjectHue = (id) => HUES[(Number(id ?? 0) + 7) % HUES.length];

const subjectColors = (id) => {
  const hue = subjectHue(id);
  return {
    bg: `hsl(${hue}, 85%, 45%)`,
    text: "#fff",
    border: `hsl(${hue}, 65%, 40%)`,
  };
};

const pad = (n) => String(n).padStart(2, "0");
const toMins = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
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
    "PRODID:-//Takwa Etablissement//parent Emploi du temps//EN",
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
  return lines.join("\r\n");
};

/* ================= Parent Timetable (Agenda only) ================= */

export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId]   = useState("");
  const [timetable, setTimetable] = useState(null);
  const [lessons, setLessons]     = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const [loading, setLoading]         = useState(true);
  const [loadingChild, setLoadingChild] = useState(false);
  const [err, setErr] = useState("");

  // 1) Load linked children
  useEffect(() => {
    (async () => {
      try {
        // adjust endpoint if your backend differs (e.g., /parent/students)
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
        const res = await TimetableApi.parent?.({ child_id: childId }) ?? TimetableApi.student?.({ child_id: childId });
        const payload = unwrapPayload(res);
        if (Array.isArray(payload)) {
          setLessons(payload);
          setTimetable(payload[0]?.timetable ?? null);
        } else {
          setLessons(payload?.lessons ?? (payload?.data ?? []));
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

  const subjects = useMemo(() => {
    const s = new Map();
    for (const l of lessons ?? []) {
      const id = l.subject?.id ?? l.subject_id;
      const name = l.subject?.name ?? "Matière";
      if (id) s.set(id, name);
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
            {timetable?.title ? `${emploidutemps.title}` : "Enfant Emploi du temps"}
          </div>
          <ToolbarSubtitle weekOffset={weekOffset} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Select child:</label>
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background text-foreground"
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {(c.firstname && c.lastname) ? `${c.firstname} ${c.lastname}` : (c.name ?? `#${c.id}`)}
              </option>
            ))}
          </select>

          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />

          <IcsButton childName={(() => {
            const c = children.find(x => String(x.id) === String(childId));
            return c ? `${c.firstname ?? ""} ${c.lastname ?? ""}`.trim() || c.name || `#${c.id}` : "";
          })()} lessons={lessons} weekOffset={weekOffset} />

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60"
          >
            Print
          </button>

          {loadingChild && <span className="text-xs text-muted-foreground">Loading timetable…</span>}
        </div>
      </div>

      {/* Legend */}
      {!!subjects.length && (
        <div className="flex flex-wrap gap-2 text-xs">
          {subjects.map((s) => {
            const c = subjectColors(s.id);
            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-2 py-0.5 border"
                style={{ borderColor: c.border, background: `${c.bg}20` }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: c.bg }} />
                <span className="text-foreground/80">{s.name}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Agenda (only view) */}
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
      arr.sort((a, b) => (toMins(getStart(a)) ?? 0) - (toMins(getEnd(b)) ?? 0));
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
                  const c = subjectColors(l.subject?.id ?? l.subject_id);
                  const subjectName = l.subject?.name ?? "Matière";
                  const teacher = teacherName(l.teacher);
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
                            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                          >
                            {subjectName}
                          </span>
                        ) : subjectName}
                        <span className="text-muted-foreground">
                          {getStart(l) && getEnd(l)
                            ? `(${getStart(l)}–${getEnd(l)})`
                            : l.period
                            ? `• Period ${l.period}`
                            : ""}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {teacher ? `By ${enseignant}` : ""}{room ? ` • ${room}` : ""}
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
      const dayIdx = dow === 7 ? 6 : dow - 1;
      const date = addDays(monday, dayIdx);

      const [sh, sm] = String(getStart(l) ?? "00:00").split(":").map(Number);
      const [eh, em] = String(getEnd(l)   ?? "00:00").split(":").map(Number);
      const start = new Date(date); start.setHours(sh || 0, sm || 0, 0, 0);
      const end   = new Date(date); end.setHours(eh || 0, em || 0, 0, 0);

      const subj = l.subject?.name ?? "Lesson";
      const room = l.room?.name ?? l.room ?? "";
      const teacher = teacherName(l.teacher);

      events.push({
        uid: `${l.id ?? Math.random().toString(36).slice(2)}@takwa`,
        start,
        end,
        title: childName ? `${childName} • ${subj}` : subj,
        location: room,
        desc: teacher ? `By ${enseignant}` : "",
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
