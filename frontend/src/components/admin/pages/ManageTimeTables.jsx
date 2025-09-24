// src/components/Admin/Pages/ManageTimeTables.jsx
import { useEffect, useMemo, useState } from "react";
import TimetableApi from "../../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../../api/axios";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

/* ========================= Helpers & Config ========================= */

const unwrap = (r) => r?.data?.data ?? r?.data ?? [];
const getStart = (row) => row?.start_time ?? row?.starts_at ?? null;
const getEnd   = (row) => row?.end_time   ?? row?.ends_at   ?? null;

const DAYS = [
  { label: "Lun", val: 1 },
  { label: "Mar", val: 2 },
  { label: "Mer", val: 3 },
  { label: "Jeu", val: 4 },
  { label: "Ven", val: 5 },
  { label: "Sam", val: 6 },
  { label: "Dim", val: 7 },
];

const HUES = [210, 260, 330, 0, 30, 120, 160];
const subjectHue = (id) => HUES[(Number(id ?? 0) + 7) % HUES.length];

const fetchAdminTimetables = (params) => {
  const fn = TimetableApi.adminList ?? TimetableApi.list;
  return fn(params);
};

const pad2 = (n) => String(n).padStart(2,"0");
const fmtMonth = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const monIndex = (jsDay) => (jsDay + 6) % 7;

const startOfWeekMonday = (base = new Date()) => {
  const d = new Date(base);
  const js = d.getDay(); // 0..6
  const delta = js === 0 ? -6 : 1 - js;
  d.setDate(d.getDate() + delta);
  d.setHours(0,0,0,0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const parseTimeLike = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return `${pad2(+m[1])}:${pad2(+m[2])}`;
  m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (m) return `${pad2(+m[1])}:${pad2(+(m[2] ?? 0))}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${pad2(+m[1])}:${pad2(+m[2])}`;
  m = s.match(/^(\d{1,2})$/);
  if (m) return `${pad2(+m[1])}:00`;
  return null;
};
const toMins = (hhmm) => {
  const s = parseTimeLike(hhmm);
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return h*60 + m;
};

const SCHOOL_START_MINS    = 9 * 60;   // 09:00
const PERIOD_DURATION_MINS = 60;       // 60-minute period length
const snapToHour = (val) => {
  const s = parseTimeLike(val);
  if (!s) return "";
  const [h] = s.split(":");
  return `${h}:00`;
};
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    handler(mql);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);
  return matches;
}

/* ========================= Main Component ========================= */

export default function ManageTimetables() {
  const [view, setView]             = useState("weekly"); // 'weekly' | 'monthly'
  const [showCreate, setShowCreate] = useState(false);

  // shared filters
  const [degreeId, setDegreeId]   = useState("__all__");
  const [teacherId, setTeacherId] = useState("__all__");

  // weekly controls
  const [hidePastWeekly, setHidePastWeekly] = useState(true);

  // refs data
  const [degrees, setDegrees]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms]       = useState([]);

  // weekly data
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // monthly data
  const [month, setMonth]           = useState(fmtMonth(new Date()));
  const [plans, setPlans]           = useState([]);
  const [plansLoading, setPLoading] = useState(false);
  const [highlightDate, setHighlightDate] = useState(null);


  // lookups
  useEffect(() => {
    (async () => {
      try {
        const [degRes, tchRes, subRes] = await Promise.all([
          axiosClient.get("/admin/degrees",  { params: { per_page: 200 } }),
          axiosClient.get("/admin/users",    { params: { role: "enseignant", per_page: 200 } }),
          axiosClient.get("/admin/subjects", { params: { per_page: 200 } }),
        ]);
        setDegrees(unwrap(degRes));
        setTeachers(unwrap(tchRes));
        setSubjects(unwrap(subRes));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load filter lists");
      }
      try {
        const roomRes = await axiosClient.get("/admin/rooms", { params: { per_page: 200 } });
        setRooms(unwrap(roomRes));
      } catch {
        setRooms([]);
      }
    })();
  }, []);

  // WEEKLY — load
  const loadWeekly = async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 1000,
        ...(degreeId !== "__all__" ? { degree_id: degreeId } : {}),
        ...(teacherId !== "__all__" ? { teacher_id: teacherId } : {}),
      };
      const res = await fetchAdminTimetables(params);
      setRows(unwrap(res));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load timetables");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (view === "weekly") loadWeekly(); }, [view]); // eslint-disable-line

  // MONTHLY — load
  const loadPlans = async () => {
    if (degreeId === "__all__") { setPlans([]); return; }
    setPLoading(true);
    try {
      const res = await axiosClient.get("/admin/monthly-plans", {
        params: { month, degree_id: degreeId, per_page: 500 },
      });
      setPlans(unwrap(res));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load monthly plans");
    } finally {
      setPLoading(false);
    }
  };
  useEffect(() => { if (view === "monthly") loadPlans(); }, [view, month, degreeId]); // eslint-disable-line

  // jump to Monthly after create
  const goMonthly = ({ month: m, degreeId: d, focusDate }) => {
    if (d) setDegreeId(String(d));
    if (m) setMonth(m);
    if (focusDate) setHighlightDate(focusDate);
    setView("monthly");
  };

  const resetFilters = async () => {
    setDegreeId("__all__");
    setTeacherId("__all__");
    setHighlightDate(null);
    if (view === "weekly") await loadWeekly(); else setPlans([]);
  };

  /* ---------------------- Robust bulk delete ---------------------- */
  const bulkDeleteRows = async (ids, label = "rows") => {
    if (!ids?.length) { toast.message("Nothing to delete."); return; }
    const ok = window.confirm(`This will permanently delete ${ids.length} ${label}. Continue?`);
    if (!ok) return;

    setCleaning(true);
    try {
      // delete in parallel but not to overload server
      const chunks = (arr, n) => arr.reduce((a,_,i) => (i%n? a[a.length-1].push(arr[i]) : a.push([arr[i]]), a), []);
      const parts = chunks(ids, 10); // 10 at a time
      let success = 0, fail = 0;

      for (const batch of parts) {
        const res = await Promise.allSettled(
          batch.map((id) => axiosClient.delete(`/admin/timetables/${id}`))
        );
        for (const r of res) r.status === "fulfilled" ? success++ : fail++;
      }
      toast.success(`Deleted ${success} item(s)` + (fail ? `, ${fail} failed` : ""));
      await loadWeekly();
    } catch (e) {
      console.error(e);
      toast.error("Failed while deleting timetables");
    } finally {
      setCleaning(false);
    }
  };

  // Clean button (all currently loaded & filtered)
  const cleanWeekly = async () => {
    const ids = (rows ?? []).map(r => r?.id).filter(Boolean);
    await bulkDeleteRows(ids, "loaded weekly rows");
  };

  return (
    <div className="space-y-6">
      {/* View switch */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={view === "weekly" ? "default" : "secondary"} onClick={() => setView("weekly")}>Semaines</Button>
        <Button variant={view === "monthly" ? "default" : "secondary"} onClick={() => setView("monthly")}>Mois</Button>
      </div>

      {/* Filters (responsive) */}
      <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl bg-muted/40 border">
        <div className="min-w-[180px]">
          <Select value={degreeId} onValueChange={setDegreeId}>
            <SelectTrigger><SelectValue placeholder="Filtrer by degree" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les Niveaux</SelectItem>
              {degrees.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {view === "weekly" && (
          <>
            <div className="min-w-[200px]">
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger><SelectValue placeholder="Filtrer by enseignant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les Enseignants</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.firstname} {t.lastname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hide past toggle */}
            <label className="inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border bg-background">
              <input
                type="checkbox"
                checked={hidePastWeekly}
                onChange={(e) => setHidePastWeekly(e.target.checked)}
              />
              masker les semaines (passées)

            </label>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowCreate(true)} variant="secondary">+ Nouveau Rangé</Button>
              <Button onClick={loadWeekly} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
              <Button
                variant="destructive"
                onClick={cleanWeekly}
                disabled={cleaning || loading || rows.length === 0}
                title="Supprimer all loaded rows"
              >
                {cleaning ? "Entrain de Nettoyer" : "Nettoyer"}
              </Button>
            </div>
          </>
        )}

        {view === "monthly" && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const d = new Date(y, m-1, 1); d.setMonth(d.getMonth()-1);
                setMonth(fmtMonth(d));
              }}
            >←</Button>

            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />

            <Button
              variant="secondary"
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const d = new Date(y, m-1, 1); d.setMonth(d.getMonth()+1);
                setMonth(fmtMonth(d));
              }}
            >→</Button>

            <Button onClick={loadPlans} disabled={plansLoading}>{plansLoading ? "Chargement..." : "Chargement"}</Button>
          </div>
        )}

        <Button variant="ghost" onClick={resetFilters} disabled={loading || plansLoading}>Restart</Button>
      </div>

      {/* Weekly create */}
      {view === "weekly" && showCreate && (
        <CreateRowPanel
          degrees={degrees}
          teachers={teachers}
          subjects={subjects}
          rooms={rooms}
          onCancel={() => setShowCreate(false)}
          goMonthly={goMonthly}
          onCreated={async () => {
            await loadWeekly();
            toast.success("Row created");
            setShowCreate(false);
          }}
        />
      )}

      {/* Weekly rows */}
      {view === "weekly" && (
        <WeeklyGrid
          rows={rows}
          hidePast={hidePastWeekly}
          reload={loadWeekly}
          onBulkDelete={bulkDeleteRows}
        />
      )}

      {/* Monthly planner */}
      {view === "monthly" && (
        <MonthlyPlanner
          key={`${month}-${degreeId}`}
          month={month}
          degreeId={degreeId}
          subjects={subjects}
          teachers={teachers}
          plans={plans}
          reload={loadPlans}
          highlightDate={highlightDate}
          onClearHighlight={() => setHighlightDate(null)}
        />
      )}
    </div>
  );
}

/* ========================= Weekly Render ========================= */

function WeeklyGrid({ rows, hidePast, onBulkDelete, reload }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  // group by degree (unchanged)
  const grouped = useMemo(() => {
    const byDegree = new Map();
    for (const r of rows) {
      const dId = r.degree_id ?? r.degree?.id ?? "unknown";
      if (!byDegree.has(dId)) byDegree.set(dId, { degree: r.degree ?? null, items: [] });
      byDegree.get(dId).items.push(r);
    }
    return Array.from(byDegree.values());
  }, [rows]);

  if (!grouped.length) {
    return <div className="text-sm text-muted-foreground">Pas de rangée d'emploi du temps trouvé</div>;
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ degree, items }, idx) =>
        isMobile ? (
          <DegreeTimetableMobile
            key={degree?.id ?? idx}
            degree={degree}
            items={items}
            hidePast={hidePast}
            onBulkDelete={onBulkDelete}
            reload={reload}
          />
        ) : (
          <DegreeTimetable
            key={degree?.id ?? idx}
            degree={degree}
            items={items}
            hidePast={hidePast}
            onBulkDelete={onBulkDelete}
            reload={reload}
          />
        )
      )}
    </div>
  );
}
function DegreeTimetableMobile({ degree, items, hidePast, onBulkDelete, reload }) {
  const { rowsByDay, idsForDegree } = useMemo(() => {
    const m = new Map(DAYS.map(d => [d.val, []]));
    const today = new Date();
    const js = today.getDay(); // 0..6
    const todayIdx = js === 0 ? 7 : js; // 1..7
    const nowMins = today.getHours()*60 + today.getMinutes();

    for (const it of items) {
      const dow = Number(it.day_of_week);
      if (hidePast) {
        if (dow < todayIdx) continue;
        if (dow === todayIdx) {
          const end = toMins(getEnd(it));
          if (end != null && end <= nowMins) continue;
        }
      }
      m.get(dow)?.push(it);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const sa = getStart(a), sb = getStart(b);
        if (sa && sb) return String(sa).localeCompare(String(sb));
        return (Number(a.period) || 0) - (Number(b.period) || 0);
      });
      m.set(k, arr);
    }
    const ids = items.map(x => x?.id).filter(Boolean);
    return { rowsByDay: m, idsForDegree: ids };
  }, [items, hidePast]);

  const deleteAllForDegree = async () => {
    await onBulkDelete(idsForDegree, `rows in degree "${degree?.name ?? "unknown"}"`);
    await reload();
  };

  return (
    <div className="rounded-2xl p-4 shadow-sm bg-card text-card-foreground border">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-foreground">
          {degree?.name ? `Niveau: ${degree.name}` : "Niveau"}
        </div>
        <Button
          variant="destructive"
          onClick={deleteAllForDegree}
          disabled={!idsForDegree.length}
          title="Supprimer all weekly rows for this degree"
          size="sm"
          className="h-8"
        >
          <Trash2 className="h-4 w-4 mr-1" /> Tout Supprimer
        </Button>
      </div>

      {/* Mobile: stacked days with sticky subheaders */}
      <div className="flex flex-col gap-3">
        {DAYS.map(({ label, val }) => (
          <div key={val} className="rounded-xl border bg-muted/30">
            <div className="sticky top-[64px] z-10 px-3 py-2 bg-muted/60 backdrop-blur text-xs font-semibold text-foreground/80 rounded-t-xl">
              {label}
            </div>
            <div className="p-3 flex flex-col gap-2">
              {rowsByDay.get(val)?.length ? rowsByDay.get(val).map((l) => {
                const subjectName = l.subject?.name ?? "—";
                return (
                  <div
                    key={l.id ?? `${val}-${l.degree_id ?? degree?.id ?? "x"}-${l.subject_id ?? "s"}-${getStart(l) ?? l.period ?? "p"}`}
                    className="rounded-lg border p-2 bg-background"
                  >
                    <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                      {(l.subject?.id || l.subject_id) && (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: `hsl(${subjectHue(l.subject?.id)}, 30%, 25%)`, color: 'white' }}
                        >
                          {subjectName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getStart(l) && getEnd(l)
                          ? `(${getStart(l)}–${getEnd(l)})`
                          : l.period ? `• ${l.period} h` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {l.teacher ? <>Par {l.teacher.firstname} {l.teacher.lastname}</> : null}
                      {l.room?.name ? <> • {l.room.name}</> : null}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function DegreeTimetable({ degree, items, hidePast, onBulkDelete, reload }) {
  // Build rows by day (with optional hiding of past)
  const { rowsByDay, idsForDegree } = useMemo(() => {
    const m = new Map(DAYS.map(d => [d.val, []]));
    const today = new Date();
    const js = today.getDay(); // 0..6
    const todayIdx = js === 0 ? 7 : js; // 1..7
    const nowMins = today.getHours()*60 + today.getMinutes();

    for (const it of items) {
      const dow = Number(it.day_of_week);
      if (hidePast) {
        if (dow < todayIdx) continue; // earlier day → hide
        if (dow === todayIdx) {
          // if has times and already finished, hide
          const end = toMins(getEnd(it));
          if (end != null && end <= nowMins) continue;
        }
      }
      if (!m.has(dow)) m.set(dow, []);
      m.get(dow).push(it);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const sa = getStart(a), sb = getStart(b);
        if (sa && sb) return String(sa).localeCompare(String(sb));
        return (Number(a.period) || 0) - (Number(b.period) || 0);
      });
      m.set(k, arr);
    }
    const ids = items.map(x => x?.id).filter(Boolean);
    return { rowsByDay: m, idsForDegree: ids };
  }, [items, hidePast]);

  const deleteAllForDegree = async () => {
    await onBulkDelete(idsForDegree, `rows in degree "${degree?.name ?? "unknown"}"`);
    await reload();
  };

  return (
    <div className="rounded-2xl p-4 shadow-sm bg-card text-card-foreground border">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-foreground">
          {degree?.name ? `Niveau: ${degree.name}` : "Niveau"}
        </div>
        <Button variant="destructive" onClick={deleteAllForDegree} disabled={!idsForDegree.length} title="Supprimer all weekly rows for this degree">
          <Trash2 className="h-4 w-4 mr-1" /> Delete all for this degree
        </Button>
      </div>

      {/* Responsive: horizontal scroll on phones */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px] md:min-w-0">
          <div className="grid grid-cols-7 gap-3 text-sm">
            {DAYS.map(({ label, val }) => (
              <div key={val}>
                <div className="font-semibold mb-2 text-foreground/90">{label}</div>
                <div className="space-y-2">
                  {rowsByDay.get(val)?.map((l) => {
                    const subjectName = l.subject?.name ?? "—";
                    return (
                      <div
                        key={l.id ?? `${val}-${l.degree_id ?? degree?.id ?? "x"}-${l.subject_id ?? "s"}-${getStart(l) ?? l.period ?? "p"}`}
                        className="rounded-xl border p-2 bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {l.subject?.id || l.subject_id ? (
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: `hsl(${subjectHue(l.subject?.id)}, 30%, 25%)`, color: 'white' }}
                            >
                              {subjectName}
                            </span>
                          ) : subjectName}
                          {" "}
                          {getStart(l) && getEnd(l)
                            ? `(${getStart(l)}–${getEnd(l)})`
                            : l.period ? `• Periods ${l.period}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {l.teacher ? <>By {l.teacher.firstname} {l.teacher.lastname}</> : null}
                          {l.degree?.name ? <> • {l.degree.name}</> : null}
                          {l.room?.name ? <> • {l.room.name}</> : null}
                        </div>
                      </div>
                    );
                  })}
                  {!rowsByDay.get(val)?.length && <div className="text-xs text-muted-foreground">—</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= Create Row Panel ========================= */
/* (unchanged from your last version with snapping/period logic) */
function CreateRowPanel({ degrees, teachers, subjects, rooms, onCancel, onCreated, goMonthly }) {
  const [form, setForm] = useState({
    degree_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: "1",
    starts_at: "",
    ends_at: "",
    period: "",        // STRING — count of periods
    room_id: "",
  });

  const [monthlyMonth, setMonthlyMonth] = useState(""); // "YYYY-MM"
  const [monthlyDay, setMonthlyDay]     = useState(""); // "1..31"
  const [monthlyTitle, setMonthlyTitle] = useState("");
  const [monthlyAuto, setMonthlyAuto]   = useState(true);
  const [saving, setSaving] = useState(false);

  // helpers for period/count <-> times
  const periodCountFromTimes = (startStr, endStr) => {
    const s = toMins(startStr), e = toMins(endStr);
    if (s == null || e == null || e <= s) return "";
    const dur = e - s;
    return dur % PERIOD_DURATION_MINS === 0 ? String(dur / PERIOD_DURATION_MINS) : "";
  };
  const endFromStartAndPeriodCount = (startStr, periodCountStr) => {
    const s = toMins(startStr); const cnt = Number(periodCountStr);
    if (s == null || !cnt || cnt < 1) return "";
    const e = s + cnt * PERIOD_DURATION_MINS;
    return `${pad2(Math.floor(e/60))}:00`;
  };
  const timesFromPeriodCount = (countStr) => {
    const cnt = Number(countStr);
    if (!cnt || cnt < 1) return { starts_at: "", ends_at: "" };
    const s = SCHOOL_START_MINS;
    const e = s + cnt * PERIOD_DURATION_MINS;
    const toHH = (mins) => `${pad2(Math.floor(mins/60))}:00`;
    return { starts_at: toHH(s), ends_at: toHH(e) };
  };

  // wired inputs (snap HH:00, auto period count)
  const onChangeStart = (val) => {
    const start = snapToHour(val);
    setForm(f => {
      const next = { ...f, starts_at: start };
      if (next.ends_at) next.period = periodCountFromTimes(start, next.ends_at);
      else if (next.period) next.ends_at = endFromStartAndPeriodCount(start, next.period);
      return next;
    });
  };
  const onChangeEnd = (val) => {
    const end = snapToHour(val);
    setForm(f => {
      const next = { ...f, ends_at: end };
      if (next.starts_at) next.period = periodCountFromTimes(next.starts_at, end);
      return next;
    });
  };
  const onChangePeriod = (val) => {
    const v = String(val ?? "").trim();
    setForm(f => {
      const next = { ...f, period: v };
      if (next.starts_at && v) next.ends_at = endFromStartAndPeriodCount(next.starts_at, v);
      if (!next.starts_at && !next.ends_at && v) Object.assign(next, timesFromPeriodCount(v));
      return next;
    });
  };

  // auto month/day from DoW (current week) until user edits
  useEffect(() => {
    if (!monthlyAuto) return;
    const monday = startOfWeekMonday(new Date());
    const d = addDays(monday, Number(form.day_of_week) - 1);
    setMonthlyMonth(fmtMonth(d));
    setMonthlyDay(String(d.getDate()));
  }, [form.day_of_week, monthlyAuto]);

  const canSave =
    form.degree_id &&
    form.subject_id &&
    form.teacher_id &&
    form.day_of_week &&
    ((form.starts_at && form.ends_at) || form.period);

  const toYmdFromYm = (ym, dStr) => {
    const [y, m] = ym.split("-").map(Number);
    return `${y}-${pad2(m)}-${pad2(Number(dStr))}`;
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let payload = { ...form };
      payload.starts_at = payload.starts_at ? snapToHour(payload.starts_at) : "";
      payload.ends_at   = payload.ends_at   ? snapToHour(payload.ends_at)   : "";

      if ((!payload.starts_at || !payload.ends_at) && payload.period) {
        if (payload.starts_at) payload.ends_at = endFromStartAndPeriodCount(payload.starts_at, payload.period);
        else Object.assign(payload, timesFromPeriodCount(payload.period));
      }
      if (!payload.period && payload.starts_at && payload.ends_at) {
        payload.period = periodCountFromTimes(payload.starts_at, payload.ends_at);
      }

      const rowPayload = {
        degree_id: Number(payload.degree_id),
        subject_id: Number(payload.subject_id),
        teacher_id: Number(payload.teacher_id),
        day_of_week: Number(payload.day_of_week),
        ...(payload.starts_at ? { starts_at: payload.starts_at } : {}),
        ...(payload.ends_at ? { ends_at: payload.ends_at } : {}),
        ...(payload.period ? { period: String(payload.period) } : {}),
        ...(payload.room_id ? { room_id: Number(payload.room_id) } : {}),
      };

      const res = await TimetableApi.create(rowPayload);
      const created = res?.data?.data ?? res?.data;

      if (monthlyMonth && monthlyDay) {
        const plan_date = toYmdFromYm(monthlyMonth, monthlyDay);
        try {
          await axiosClient.post("/admin/monthly-plans", {
            plan_date,
            degree_id: Number(payload.degree_id),
            subject_id: Number(payload.subject_id),
            teacher_id: Number(payload.teacher_id),
            title: form.monthlyTitle || null,
          });
          toast.success("Monthly plan created");
          goMonthly?.({ month: monthlyMonth, degreeId: payload.degree_id, focusDate: plan_date });
        } catch (e) {
          console.error(e);
          toast.error(e?.response?.data?.message || "Emploi du temps saved, but monthly plan failed");
        }
      }

      onCreated?.(created);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message
        || Object.values(e?.response?.data?.errors ?? {})?.[0]?.[0]
        || "Failed to create row";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const stopAuto = () => setMonthlyAuto(false);

  return (
    <div className="rounded-2xl border p-4 bg-card text-card-foreground space-y-4">
      <div className="font-semibold">créer un rangé d'emploi du temps</div>

      <div className="grid md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <Select value={form.degree_id} onValueChange={(v) => setForm(f => ({ ...f, degree_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Niveau *" /></SelectTrigger>
            <SelectContent>
              {degrees.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Select value={form.subject_id} onValueChange={(v) => setForm(f => ({ ...f, subject_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Matière *" /></SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Select value={form.teacher_id} onValueChange={(v) => setForm(f => ({ ...f, teacher_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Enseignant *" /></SelectTrigger>
            <SelectContent>
              {teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.firstname} {t.lastname}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={form.day_of_week} onValueChange={(v) => setForm(f => ({ ...f, day_of_week: v }))}>
            <SelectTrigger><SelectValue placeholder="Day *" /></SelectTrigger>
            <SelectContent>
              {DAYS.map(d => <SelectItem key={d.val} value={String(d.val)}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Input type="time" step={3600} value={form.starts_at} onChange={(e) => onChangeStart(e.target.value)} onBlur={(e)=>onChangeStart(e.target.value)} placeholder="Start" />
        </div>
        <div>
          <Input type="time" step={3600} value={form.ends_at} onChange={(e) => onChangeEnd(e.target.value)} onBlur={(e)=>onChangeEnd(e.target.value)} placeholder="End" />
        </div>

        <div>
          <Input type="number" min="1" value={form.period} onChange={(e) => onChangePeriod(e.target.value)} placeholder="Periods (count)" />
        </div>

        <div className="md:col-span-2">
          <Select value={form.room_id} onValueChange={(v) => setForm(f => ({ ...f, room_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Room (optional)" /></SelectTrigger>
            <SelectContent>
              {rooms.length ? rooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>) : null}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
        <div className="text-sm font-medium">Créer aussi l'emploi du temps pour le mois(optionel)</div>
        <div className="grid md:grid-cols-6 gap-3">
          <div>
            <Input type="month" value={monthlyMonth} onChange={(e) => { stopAuto(); setMonthlyMonth(e.target.value); }} className="h-9" />
          </div>
          <div>
            <Select value={monthlyDay || undefined} onValueChange={(v) => { stopAuto(); setMonthlyDay(v); }} disabled={!monthlyMonth}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Day" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  if (!monthlyMonth) return null;
                  const [y, m] = monthlyMonth.split("-").map(Number);
                  const count = new Date(y, m, 0).getDate();
                  return Array.from({ length: count }, (_, i) => {
                    const d = String(i + 1);
                    return <SelectItem key={d} value={d}>{d}</SelectItem>;
                  });
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Input value={monthlyTitle} onChange={(e) => setMonthlyTitle(e.target.value)} placeholder="Plan title (optional)" className="h-9" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Day-of-week auto-fills the date to the matching day in <b>this week</b> until you change month/day.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={!((form.degree_id && form.subject_id && form.teacher_id && form.day_of_week) && ((form.starts_at && form.ends_at) || form.period)) || saving}>
          {saving ? "Saving…" : "Enregistrer row"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Required: Degree, Subject, Teacher, Day, and either Start/End (we set <em>Periods</em> automatically) <em>or</em> a Period count (we’ll compute End).
      </div>
    </div>
  );
}

/* ========================= Monthly Planner ========================= */

function MonthlyPlanner({ month, degreeId, subjects, teachers, plans, reload, highlightDate, onClearHighlight }) {
  const NONE = "__none__";
  const [openDate, setOpenDate] = useState(null);
  const [mini, setMini] = useState({ subject_id: "", teacher_id: "", title: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { if (degreeId === "__all__") setOpenDate(null); }, [degreeId]);
  useEffect(() => { setOpenDate(null); }, [month]);

  useEffect(() => {
    if (highlightDate) {
      setOpenDate(highlightDate);
      const t = setTimeout(() => onClearHighlight?.(), 1200);
      return () => clearTimeout(t);
    }
  }, [highlightDate, onClearHighlight]);

  const y = Number(month.split("-")[0]);
  const m = Number(month.split("-")[1]);

  const first = new Date(y, m - 1, 1);
  const leadBlanks = monIndex(first.getDay());
  const totalDays = daysInMonth(y, m);
  const cells = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const plansByDate = useMemo(() => {
    const map = new Map();
    for (const p of plans ?? []) {
      if (!map.has(p.plan_date)) map.set(p.plan_date, []);
      map.get(p.plan_date).push(p);
    }
    return map;
  }, [plans]);

  const ymd = (d) => (d ? `${y}-${pad2(m)}-${pad2(d)}` : null);

  const quickAdd = async (dateStr) => {
    if (degreeId === "__all__") { toast.error("Select a Niveau first."); return; }
    const { subject_id, teacher_id, title } = mini;
    if (!subject_id) { toast.error("Matière is required"); return; }
    setSaving(true);
    try {
      await axiosClient.post("/admin/monthly-plans", {
        plan_date: dateStr,
        degree_id: Number(degreeId),
        subject_id: Number(subject_id),
        teacher_id: mini.teacher_id && mini.teacher_id !== NONE ? Number(teacher_id) : null,
        title: title || null,
      });
      setMini({ subject_id: "", teacher_id: "", title: "" });
      setOpenDate(null);
      await reload();
      toast.success("Plan added");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to add plan");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId) => {
    const ok = window.confirm("Supprimer this plan permanently?");
    if (!ok) return;
    setDeletingId(planId);
    try {
      await axiosClient.delete(`/admin/monthly-plans/${planId}`);
      await reload();
      toast.success("Plan deleted");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl p-4 shadow-sm bg-card text-card-foreground border">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-foreground">
          Monthly Subject Plans {degreeId !== "__all__" ? "" : "(select a degree)"}
        </div>
      </div>

      {/* Scroll container with sticky weekday header; narrower min-width for phones */}
      <div className="overflow-x-auto snap-x snap-mandatory">
        <div className="min-w-[560px] md:min-w-0">
          <div className="grid grid-cols-7 gap-2 text-[11px] md:text-xs font-medium text-muted-foreground mb-2 sticky top-[64px] bg-card z-10 px-1 py-1">
            {DAYS.map(d => <div key={d.val} className="px-1 md:px-2">{d.label}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-sm">
            {(() => {
              const cellsOut = [];
              let idx = 0;
              for (let i = 0; i < leadBlanks; i++) { cellsOut.push(<div key={`b-${i}`} className="min-h-[84px] md:min-h-[110px]" />); idx++; }
              for (let d = 1; d <= totalDays; d++, idx++) {
                const dateStr = ymd(d);
                const dayPlans = dateStr ? (plansByDate.get(dateStr) ?? []) : [];
                cellsOut.push(
                  <DayCell
                    key={dateStr}
                    dateStr={dateStr}
                    dayNumber={d}
                    degreeId={degreeId}
                    subjects={subjects}
                    teachers={teachers}
                    dayPlans={dayPlans}
                    quickAdd={quickAdd}
                    deletePlan={deletePlan}
                  />
                );
              }
              while (idx % 7 !== 0) { cellsOut.push(<div key={`t-${idx}`} className="min-h-[84px] md:min-h-[110px]" />); idx++; }
              return cellsOut;
            })()}
          </div>

          {degreeId === "__all__" && (
            <div className="mt-3 text-xs text-muted-foreground">Select a degree to view or add monthly subject plans.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({ dateStr, dayNumber, degreeId, subjects, teachers, dayPlans, quickAdd, deletePlan }) {
  const NONE = "__none__";
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState({ subject_id: "", teacher_id: "", title: "" });
  const [saving, setSaving] = useState(false);
  return (
    <div
      className={`min-h-[84px] md:min-h-[110px] rounded-xl border p-2 md:p-3 transition-colors flex flex-col gap-2
        ${open ? "bg-muted/60 ring-2 ring-primary/50" : "bg-muted/30 hover:bg-muted/50"}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] md:text-xs font-semibold text-foreground/80">{dayNumber}</div>
        {degreeId !== "__all__" && (
          <Button size="sm" variant="secondary" className="h-6 px-2" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Add"}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {dayPlans.map((p) => (
          <div key={p.id} className="inline-flex items-center gap-2 rounded-md px-2 py-1 bg-muted">
            {p.subject?.name ? (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `hsl(${subjectHue(p.subject?.id ?? p.subject_id)}, 30%, 25%)`, color: "white" }}
              >
                {p.subject.name}
              </span>
            ) : null}
            <span className="text-xs text-foreground flex-1 truncate">{p.title || ""}</span>
            <button
              className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-background/70"
              title="Supprimer plan"
              onClick={() => deletePlan(p.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!dayPlans.length && <span className="text-[11px] text-muted-foreground">—</span>}
      </div>

      {open && (
        <div className="mt-auto border rounded-md p-2 bg-background">
          <div className="text-[10px] md:text-[11px] mb-1 text-muted-foreground">{dateStr}</div>
          <div className="grid grid-cols-1 gap-2">
            <Select value={mini.subject_id} onValueChange={(v) => setMini((s) => ({ ...s, subject_id: v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Matière *" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={mini.teacher_id || NONE} onValueChange={(v) => setMini((s) => ({ ...s, teacher_id: v === NONE ? "" : v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Enseignant (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.firstname} {t.lastname}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input value={mini.title} onChange={(e) => setMini((s) => ({ ...s, title: e.target.value }))} placeholder="Title (optional)" className="h-8" />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  if (!mini.subject_id) { toast.error("Matière is required"); return; }
                  setSaving(true);
                  await quickAdd(dateStr);
                  setSaving(false);
                }}
                disabled={saving}
              >
                {saving ? "Saving…" : "Enregistrer"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

