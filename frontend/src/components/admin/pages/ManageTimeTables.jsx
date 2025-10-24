// src/components/admin/pages/ManageTimeTables.jsx
import { useEffect, useMemo, useState } from "react";
import TimeTableApi from "../../../services/api/admin/TimeTableApi";
import { axiosClient } from "../../../api/axios";
import subjectColors from "../../../config/subjectColors";

/* ────────────────────────── Constants ────────────────────────── */
const DAYS = [
  { label: "Lun", full: "Lundi", val: 1 },
  { label: "Mar", full: "Mardi", val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi", val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi", val: 6 },
  { label: "Dim", full: "Dimanche", val: 7 },
];

const PAD = (n) => String(n).padStart(2, "0");

/* ────────────────────────── Time helpers ────────────────────────── */
const parseTimeLike = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return `${PAD(+m[1])}:${PAD(+m[2])}`;
  m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (m) return `${PAD(+m[1])}:${PAD(+(m[2] ?? 0))}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) return `${PAD(+m[1])}:${PAD(+m[2])}`;
  m = s.match(/^(\d{1,2})$/);
  if (m) return `${PAD(+m[1])}:00`;
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
  const js = d.getDay();
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
  const js = date.getDay(); // 0..6 (Sun..Sat)
  const app = js === 0 ? 7 : js;
  return app === dow1to7;
};

/* period fallback (if no times) */
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

/* ── Make week() response robust (array or {lessons:[]}) ── */
const unwrapLessons = (res) => {
  const d = res?.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data; // paginated resource
  if (Array.isArray(d?.lessons)) return d.lessons;
  if (Array.isArray(d?.data?.lessons)) return d.data.lessons;
  return [];
};

/* colors */
const slugify = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const hashInt = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const hueForKey = (key) => (hashInt(String(key)) * 137.508) % 360;
const subjectKey = (l) =>
  l?.subject?.key ??
  l?.subject?.id ??
  l?.subject_id ??
  slugify(l?.subject?.name ?? l?.subject_name ?? "subject");
const subjectSolid = (l) => {
  const key = String(subjectKey(l));
  if (subjectColors[key]) return subjectColors[key];
  return `hsl(${hueForKey(key)} 65% 45%)`;
};
const roomName = (l) => l?.room?.name ?? l?.room ?? (l?.room_id ? `Salle #${l.room_id}` : "");

/* ────────────────────────── Admin options endpoints ────────────────────────── */
const ENDPOINTS = {
  degrees: "/admin/degrees",
  subjects: "/admin/subjects",
  rooms: "/admin/rooms",
};

const isEmpty = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "null" || s === "undefined";
};
const missingFields = (f) => {
  const miss = [];
  if (isEmpty(f.degree_id))  miss.push("Niveau");
  if (isEmpty(f.subject_id)) miss.push("Matière");
  if (isEmpty(f.teacher_id)) miss.push("Enseignant");
  return miss;
};

// Teachers come from /admin/users?role=teacher
async function fetchTeachers() {
  const res = await axiosClient.get("/admin/users", { params: { role: "teacher", per_page: 1000 } });
  const arr = res?.data?.data ?? res?.data ?? [];
  return (Array.isArray(arr) ? arr : []).map(simpleUser);
}

/* ────────────────────────── Main component ────────────────────────── */
export default function ManageTimeTables() {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const mondayIso = useMemo(() => {
    const y = monday.getFullYear(), m = PAD(monday.getMonth() + 1), d = PAD(monday.getDate());
    return `${y}-${m}-${d}`;
  }, [monday]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [lessons, setLessons] = useState([]);

  const [degrees, setDegrees] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // form state
  const blank = {
    degree_id:  "",        // required
    subject_id: "",        // required
    teacher_id: "",        // required
    room_id:    "",        // optional
    day_of_week:"1",       // 1..7 (↤ fixed key)
    start_time: "09:00",   // H:i
    end_time:   "10:30",   // H:i
    period:     "",        // optional alternative
    title:      "",        // optional
  };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  // derived: which required are missing (visual hint only)
  const requiredMissing = useMemo(() => missingFields(form), [form]);

  // filters
  const [degreeFilter, setDegreeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  /* Load options + week data */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [deg, sub, roo, teachersList, wk] = await Promise.all([
          axiosClient.get(ENDPOINTS.degrees),
          axiosClient.get(ENDPOINTS.subjects),
          axiosClient.get(ENDPOINTS.rooms),
          fetchTeachers(),
          TimeTableApi.week({ week_start: mondayIso }),
        ]);

        if (!mounted) return;

        const degOpts = (deg?.data?.data ?? deg?.data ?? []).map(simpleOpt);
        const subOpts = (sub?.data?.data ?? sub?.data ?? []).map(simpleOpt);
        const roomOpts = (roo?.data?.data ?? roo?.data ?? []).map(simpleOpt);

        setDegrees(degOpts);
        setSubjects(subOpts);
        setRooms(roomOpts);
        setTeachers(teachersList);

        // Preselect defaults if empty (and not editing)
        setForm((prev) => {
          if (editingId) return prev;
          return {
            ...prev,
            degree_id: prev.degree_id || (degOpts[0]?.id != null ? String(degOpts[0].id) : ""),
            subject_id: prev.subject_id || (subOpts[0]?.id != null ? String(subOpts[0].id) : ""),
            teacher_id: prev.teacher_id || (teachersList[0]?.id != null ? String(teachersList[0].id) : ""),
          };
        });

        const raw = unwrapLessons(wk);
        const normalized = (raw ?? []).map((l) => ({
          ...l,
          day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
          start_time: parseTimeLike(l?.start ?? l?.start_time ?? l?.from ?? l?.hour_from),
          end_time: parseTimeLike(l?.end ?? l?.end_time ?? l?.to ?? l?.hour_to),
          start_minutes: numOrNull(l?.start_minutes) ?? undefined,
          end_minutes: numOrNull(l?.end_minutes) ?? undefined,
          week_start: l?.week_start ?? mondayIso,
        }));
        setLessons(normalized);
        setErr("");
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Impossible de charger les données");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mondayIso]);

  /* Derived lists & shown lessons */
  const filtered = useMemo(() => {
    let arr = lessons ?? [];
    if (degreeFilter) arr = arr.filter((l) => String(l.degree?.id ?? l.degree_id) === String(degreeFilter));
    if (subjectFilter) arr = arr.filter((l) => String(l.subject?.id ?? l.subject_id) === String(subjectFilter));
    return arr;
  }, [lessons, degreeFilter, subjectFilter]);

  const byDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of filtered) {
      if (l.week_start) {
        const ws = new Date(`${l.week_start}T00:00:00`);
        if (Number.isNaN(ws.getTime()) || sameMonday(ws, monday) === false) continue;
      }
      const dow = normalizeDow(l?.day_of_week);
      if (!dow) continue;
      m.get(dow)?.push(l);
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
  }, [filtered, monday]);

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
    min = Math.max(7 * 60, Math.floor((min - 30) / 30) * 30);
    max = Math.min(22 * 60, Math.ceil((max + 30) / 30) * 30);
    if (max - min < 60) max = min + 60;
    return { minM: min, maxM: max };
  }, [byDay]);
  const range = maxM - minM;

  /* ─────────────── Save / Update / Delete ─────────────── */
  const hhmm = (v) => {
    const s = parseTimeLike(v);
    if (!s) return null;
    const [h, m] = s.split(":");
    return `${PAD(h)}:${PAD(m)}`;
  };

  const normalizePayload = (state) => {
    const day_of_week = normalizeDow(state.day_of_week);

    // cast to numbers or null (backend uses integer rules)
    const degree_id  = state.degree_id  ? Number(state.degree_id)  : null;
    const subject_id = state.subject_id ? Number(state.subject_id) : null;
    const teacher_id = state.teacher_id ? Number(state.teacher_id) : null;
    const room_id    = state.room_id    ? Number(state.room_id)    : null;

    // accept either explicit times OR a "period"
    let hour_from = hhmm(state.start_time);
    let hour_to   = hhmm(state.end_time);

    if (!(hour_from && hour_to) && state.period) {
      const p = parsePeriodToMins(state.period);
      if (p) {
        const [sm, em] = p;
        hour_from = hhmm(`${Math.floor(sm/60)}:${PAD(sm%60)}`);
        hour_to   = hhmm(`${Math.floor(em/60)}:${PAD(em%60)}`);
      }
    }

    const miss = [];
    if (!day_of_week) miss.push("Jour");
    if (!degree_id)  miss.push("Niveau");
    if (!subject_id) miss.push("Matière");
    if (!teacher_id) miss.push("Enseignant");
    if (!(hour_from && hour_to)) miss.push("Heures (début/fin ou période)");
    if (miss.length) throw new Error(`Champs requis manquants: ${miss.join(", ")}`);

    // Send the exact keys your backend validates on
    return {
      degree_id,        // required|exists:degrees,id
      subject_id,       // required|exists:subjects,id
      teacher_id,       // required|exists:users,id
      room_id,          // nullable|exists:rooms,id
      day_of_week,      // required_without:day
      hour_from,        // required_without:period
      hour_to,          // required_without:period|after:hour_from
      week_start: mondayIso, // optional/nullable in backend
      title: state.title?.trim() || null,
    };
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      setSaving(true);
      const payload = normalizePayload(form);
      console.log("POST /admin/timetables payload →", payload);

      if (editingId) {
        await TimeTableApi.update(editingId, payload);
      } else {
        await TimeTableApi.create(payload);
      }

      const res = await TimeTableApi.week({ week_start: mondayIso });
      setLessons((unwrapLessons(res) ?? []).map((l) => ({
        ...l,
        day_of_week: normalizeDow(l?.day_of_week ?? l?.dow ?? l?.day),
        start_time: parseTimeLike(l?.start ?? l?.start_time ?? l?.from ?? l?.hour_from),
        end_time: parseTimeLike(l?.end ?? l?.end_time   ?? l?.to   ?? l?.hour_to),
        start_minutes: numOrNull(l?.start_minutes) ?? undefined,
        end_minutes: numOrNull(l?.end_minutes) ?? undefined,
        week_start: l?.week_start ?? mondayIso,
      })));
      setForm(blank);
      setEditingId(null);
      setErr("");
    } catch (e2) {
      const data = e2?.response?.data;
      console.error("Timetable create failed (422):", data || e2);
      let friendly = "Échec de l’enregistrement (422)";
      if (data?.message) friendly = data.message;
      if (data?.errors && typeof data.errors === "object") {
        const lines = [];
        for (const [field, arr] of Object.entries(data.errors)) {
          if (Array.isArray(arr) && arr.length) lines.push(`• ${field}: ${arr[0]}`);
        }
        if (lines.length) friendly += "\n" + lines.join("\n");
      }
      setErr(friendly);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (l) => {
    setEditingId(l.id);
    setForm({
      id: l.id,
      degree_id: String(l.degree?.id ?? l.degree_id ?? ""),
      subject_id: String(l.subject?.id ?? l.subject_id ?? ""),
      teacher_id: String(l.teacher?.id ?? l.teacher_id ?? ""),
      room_id: String(l.room?.id ?? l.room_id ?? ""),
      day_of_week: String(l.day_of_week ?? ""),
      period: l.period ?? "",
      start_time: l.start_time ?? "",
      end_time: l.end_time ?? "",
      title: l.title ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (l) => {
    if (!l?.id) return;
    if (!confirm("Supprimer cette séance ?")) return;
    try {
      await TimeTableApi.remove(l.id);
      setLessons((prev) => prev.filter((x) => x.id !== l.id));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Suppression impossible");
    }
  };

  /* ─────────────── UI ─────────────── */
  if (loading) return <div className="p-4 text-center">Chargement…</div>;
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Gestion de l’emploi du temps</h1>
          <ToolbarSubtitle monday={monday} />
        </div>
        <div className="flex flex-wrap gap-2">
          <WeekToolbar
            onPrev={() => setWeekOffset((w) => w - 1)}
            onToday={() => setWeekOffset(0)}
            onNext={() => setWeekOffset((w) => w + 1)}
          />
          <Select value={degreeFilter} onChange={setDegreeFilter}
                  options={[{ value: "", label: "Tous les niveaux" }, ...degrees.map(asOption)]} />
          <Select value={subjectFilter} onChange={setSubjectFilter}
                  options={[{ value: "", label: "Toutes les matières" }, ...subjects.map(asOption)]} />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
            Imprimer
          </button>
        </div>
      </div>

      {!teachers.length && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-2 text-xs">
          Aucun enseignant trouvé via <code>/admin/users?role=teacher</code>. Ajoutez des enseignants
          ou vérifiez les rôles côté admin.
        </div>
      )}

      {err ? (
        <div className="whitespace-pre-line rounded-md border border-red-300/50 bg-red-100/40 text-red-700 p-2 text-sm">
          {err}
        </div>
      ) : null}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <form onSubmit={onSubmit} className="rounded-xl border p-4 bg-background/60 space-y-3">
            <div className="text-sm font-semibold">{editingId ? "Modifier la séance" : "Ajouter une séance"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledSelect
                label="Niveau"
                value={form.degree_id}
                onChange={(v) => setForm((f) => ({ ...f, degree_id: v }))}
                options={[{ value: "", label: "— choisir —" }, ...degrees.map(asOption)]}
                required
              />
              <LabeledSelect
                label="Matière"
                value={form.subject_id}
                onChange={(v) => setForm((f) => ({ ...f, subject_id: v }))}
                options={[{ value: "", label: "— choisir —" }, ...subjects.map(asOption)]}
                required
              />
              <LabeledSelect
                label="Enseignant"
                value={form.teacher_id}
                onChange={(v) => setForm((f) => ({ ...f, teacher_id: v }))}
                options={[{ value: "", label: "— choisir —" }, ...teachers.map(asOption)]}
                required
              />
              <LabeledSelect
                label="Salle"
                value={form.room_id}
                onChange={(v) => setForm((f) => ({ ...f, room_id: v }))}
                options={[{ id: "", name: "—" }, ...rooms].map(asOption)}
              />
              <LabeledSelect
                label="Jour"
                value={form.day_of_week}
                onChange={(v) => setForm((f) => ({ ...f, day_of_week: v }))}
                options={DAYS.map((d) => ({ value: String(d.val), label: d.full }))}
                required
              />
              <LabeledInput label="Titre (facultatif)" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Ex: Interro, TP, …" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledInput label="Début" value={form.start_time} onChange={(v) => setForm((f) => ({ ...f, start_time: v }))} placeholder="09:00" />
              <LabeledInput label="Fin" value={form.end_time} onChange={(v) => setForm((f) => ({ ...f, end_time: v }))} placeholder="10:30" />
              <div className="self-end">
                <div className="text-[11px] text-muted-foreground mb-1">ou Période</div>
                <input
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                  placeholder="ex: 1 (ou 9:00-10:30)"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="text-xs text-muted-foreground">
                debug → degree:{String(form.degree_id)} | subject:{String(form.subject_id)} | teacher:{String(form.teacher_id)}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
              >
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
            </div>

            {requiredMissing.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mt-2 p-2">
                Veuillez sélectionner : <b>{requiredMissing.join(", ")}</b>.
              </div>
            )}

            <TimePreview start={form.start_time} end={form.end_time} period={form.period} />
          </form>
        </div>

        {/* Grid preview + list */}
        <div className="lg:col-span-2 space-y-4">
          <WeekGrid
            monday={monday}
            byDay={byDay}
            minM={minM}
            maxM={maxM}
            range={range}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <TableList rows={filtered} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Small UI pieces ────────────────────────── */
function ToolbarSubtitle({ monday }) {
  const sunday = addDays(monday, 6);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return <div className="text-sm text-muted-foreground">Semaine du {fmt(monday)} – {fmt(sunday)}</div>;
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
    <select className="px-3 py-1.5 rounded-md border bg-background text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function LabeledSelect({ label, value, onChange, options, required }) {
  return (
    <label className="block">
      <div className="text-[11px] text-muted-foreground mb-1">
        {label}{required ? " *" : ""}
      </div>
      <select
        className="w-full px-3 py-2 rounded-md border bg-background text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border bg-background text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}
function TimePreview({ start, end, period }) {
  const sm = toMins(start);
  const em = toMins(end);
  const p = !((sm != null && em != null && em > sm)) ? parsePeriodToMins(period) : null;
  const s = (sm != null && em != null && em > sm) ? [sm, em] : p;
  if (!s) return null;
  const [a, b] = s;
  return (
    <div className="text-xs text-muted-foreground">
      {`Plage détectée: ${PAD(Math.floor(a/60))}:${PAD(a%60)}–${PAD(Math.floor(b/60))}:${PAD(b%60)}`}
    </div>
  );
}

/* ────────────────────────── Grid view ────────────────────────── */
function WeekGrid({ monday, byDay, minM, maxM, range, onEdit, onDelete }) {
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

  const any = useMemo(() => DAYS.some((d) => (byDay.get(d.val) ?? []).length), [byDay]);
  if (!any) return <div className="rounded-md border p-3 text-sm text-muted-foreground">Aucune séance cette semaine.</div>;

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px] md:min-w-0">
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

          <div className="grid grid-cols-8">
            {/* hour rail */}
            <div className="relative border-r bg-background sticky left-0 z-10">
              {hourMarks.map(({ h, m }) => {
                const pct = ((m - minM) / range) * 100;
                return (
                  <div key={m} className="absolute left-0 right-0" style={{ top: `${pct}%`, transform: "translateY(-50%)" }}>
                    <div className="text-[11px] sm:text-xs text-muted-foreground px-2">{PAD(h)}:00</div>
                    <div className="h-px bg-border/70" />
                  </div>
                );
              })}
              <div style={{ paddingTop: `${range}px` }} className="opacity-0">.</div>
            </div>

            {/* day columns */}
            {DAYS.map((d) => {
              const items = byDay.get(d.val) ?? [];
              const [lanes, laneCount] = buildLanes(items);
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
                    lane.map(({ l, s, e }, i) => {
                      const s2 = Math.max(minM, Math.min(e, Math.max(s, minM)));
                      const e2 = Math.min(maxM, Math.max(s2, Math.min(e, maxM)));
                      if (e2 <= minM || s2 >= maxM) return null;

                      const topPct = ((s2 - minM) / range) * 100;
                      const heightPct = Math.max(((e2 - s2) / range) * 100, 0.8);
                      const widthPct = 100 / laneCount;
                      const leftPct = laneIndex * widthPct;

                      const solid = subjectSolid(l);
                      const subj = l?.subject?.name ?? l?.subject_name ?? "Matière";
                      const degree = l?.degree?.name ?? l?.degree_name ?? "Niveau";
                      const room = roomName(l);
                      const sText = minsToTime(s2), eText = minsToTime(e2);

                      return (
                        <div
                          key={`${l.id ?? `${d.val}-${i}`}`}
                          className="absolute rounded-lg text-[11px] sm:text-sm overflow-hidden group"
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
                          <div className="px-2 pt-1 font-semibold leading-tight truncate">{subj}</div>
                          <div className="px-2 text-[10px] sm:text-[11px] leading-tight">{sText}–{eText}</div>
                          <div className="px-2 pb-1 text-[10px] sm:text-[11px] leading-tight truncate">{degree}{room ? ` • ${room}` : ""}</div>

                          {/* actions */}
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                            <IconButton title="Modifier" onClick={() => onEdit(l)}>✏️</IconButton>
                            <IconButton title="Supprimer" onClick={() => onDelete(l)}>🗑️</IconButton>
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
function IconButton({ onClick, title, children }) {
  return (
    <button title={title} onClick={onClick}
            className="text-[12px] px-1.5 py-0.5 rounded-md bg-white/25 hover:bg-white/35">
      {children}
    </button>
  );
}
function buildLanes(items) {
  const timed = [];
  for (const l of items) {
    const mins = resolveStartEndMins(l);
    if (!mins) continue;
    timed.push({ l, s: mins[0], e: mins[1] });
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
  return [lanes, Math.max(1, lanes.length)];
}

/* ────────────────────────── Table list view ────────────────────────── */
function TableList({ rows, onEdit, onDelete }) {
  if (!rows?.length) return null;
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-foreground/80">
            <tr>
              <Th>Jour</Th>
              <Th>Niveau</Th>
              <Th>Matière</Th>
              <Th>Enseignant</Th>
              <Th>Salle</Th>
              <Th>Heure</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const day = DAYS.find((d) => d.val === normalizeDow(l?.day_of_week))?.full ?? "-";
              const degree = l?.degree?.name ?? l?.degree_name ?? "-";
              const subject = l?.subject?.name ?? l?.subject_name ?? "-";
              const teacher = l?.teacher?.firstname
                ? `${l.teacher.firstname} ${l.teacher.lastname ?? ""}`.trim()
                : (l?.teacher_name ?? "-");
              const room = roomName(l) || "-";
              const mins = resolveStartEndMins(l);
              const hr = mins ? `${minsToTime(mins[0])}–${minsToTime(mins[1])}` : "-";

              return (
                <tr key={l.id ?? Math.random()} className="border-t">
                  <Td>{day}</Td>
                  <Td>{degree}</Td>
                  <Td>{subject}</Td>
                  <Td>{teacher}</Td>
                  <Td>{room}</Td>
                  <Td>{hr}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(l)} className="px-2 py-1 rounded-md border hover:bg-muted/60">Modifier</button>
                      <button onClick={() => onDelete(l)} className="px-2 py-1 rounded-md border hover:bg-muted/60">Supprimer</button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const Th = ({ children }) => <th className="text-left px-3 py-2 whitespace-nowrap">{children}</th>;
const Td = ({ children }) => <td className="px-3 py-2 whitespace-nowrap">{children}</td>;

/* ────────────────────────── Shared logic ────────────────────────── */
function resolveStartEndMins(l) {
  const sm = numOrNull(l?.start_minutes);
  const em = numOrNull(l?.end_minutes);
  if (sm != null && em != null && em > sm) return [sm, em];
  const s = toMins(l?.start_time ?? l?.start ?? l?.from ?? l?.hour_from);
  const e = toMins(l?.end_time   ?? l?.end   ?? l?.to   ?? l?.hour_to);
  if (s != null && e != null && e > s) return [s, e];
  const p = parsePeriodToMins(l?.period);
  if (p) return p;
  return null;
}
function minsToTime(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${PAD(h)}:${PAD(mm)}`;
}

/* ────────────────────────── Option mappers ────────────────────────── */
function simpleOpt(it) {
  return { id: it?.id ?? it?.value ?? "", name: it?.name ?? it?.title ?? it?.label ?? `#${it?.id}` };
}
function simpleUser(u) {
  const id = u?.id ?? u?.value ?? "";
  const first = u?.firstname ?? u?.first_name ?? u?.first ?? "";
  const last  = u?.lastname  ?? u?.last_name  ?? u?.last  ?? "";
  const fullFromParts = [first, last].filter(Boolean).join(" ");
  const fallback = u?.name ?? (fullFromParts || u?.fullname || u?.full_name || u?.email || `#${id}`);
  const name = fallback;
  return { id, name };
}
function asOption(o) {
  return { value: String(o.id ?? ""), label: o.name ?? "" };
}
