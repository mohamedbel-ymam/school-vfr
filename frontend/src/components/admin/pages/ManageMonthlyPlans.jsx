// src/components/admin/pages/ManageMonthlyPlans.jsx
import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "../../../api/axios";
import subjectColors from "../../../config/subjectColors";

/* ------------------ time + helpers ------------------ */
const pad = (n) => String(n).padStart(2, "0");
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
const minsToHHMM = (m) => `${pad(Math.floor(m/60))}:${pad(m%60)}`;

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
const sameMonday = (a, b) => startOfWeekMonday(a).getTime() === startOfWeekMonday(b).getTime();
const inWeek = (date, monday) => {
  const start = new Date(monday);
  const end = addDays(monday, 6);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return date >= start && date <= end;
};

/* ------------------ constants ------------------ */
const DAYS = [
  { label: "Lun", full: "Lundi", val: 1 },
  { label: "Mar", full: "Mardi", val: 2 },
  { label: "Mer", full: "Mercredi", val: 3 },
  { label: "Jeu", full: "Jeudi", val: 4 },
  { label: "Ven", full: "Vendredi", val: 5 },
  { label: "Sam", full: "Samedi", val: 6 },
  { label: "Dim", full: "Dimanche", val: 7 },
];

/* ------------------ colors ------------------ */
const slugify = (s = "") =>
  s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const hashInt = (str) => { let h=0; for (let i=0;i<str.length;i++) h=(h*31 + str.charCodeAt(i))>>>0; return h; };
const hueForKey = (key) => (hashInt(String(key)) * 137.508) % 360;
const subjectKey = (p) =>
  p?.subject?.key ??
  p?.subject?.id ??
  p?.subject_id ??
  slugify(p?.subject?.name ?? p?.subject_name ?? "subject");
const subjectSolid = (p) => {
  const key = String(subjectKey(p));
  if (subjectColors[key]) return subjectColors[key];
  return `hsl(${hueForKey(key)} 65% 45%)`;
};
const subjectSoftBg = (p) => `color-mix(in oklab, ${subjectSolid(p)}, white 84%)`;

/* ------------------ api helpers ------------------ */
const unwrapList = (r) => r?.data?.data ?? r?.data ?? [];
const api = {
  subjects: () => axiosClient.get("/admin/subjects"),
  list: (month) => axiosClient.get("/admin/monthly-plans", { params: { month } }),
  create: (payload) => axiosClient.post("/admin/monthly-plans", payload),
  update: (id, payload) => axiosClient.patch(`/admin/monthly-plans/${id}`, payload),
  remove: (id) => axiosClient.delete(`/admin/monthly-plans/${id}`),
};

/* ------------------ main ------------------ */
export default function ManageMonthlyPlans() {
  // filters
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; // YYYY-MM
  });
  const [subjectFilter, setSubjectFilter] = useState("");

  // data
  const [subjects, setSubjects] = useState([]);
  const [plans, setPlans] = useState([]);

  // ui state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);

  // form
  const blank = {
    subject_id: "",
    plan_date: "",     // YYYY-MM-DD
    start_time: "",
    end_time: "",
    title: "",
  };
  const [form, setForm] = useState(blank);

  // load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [s, l] = await Promise.all([api.subjects(), api.list(month)]);
        if (!mounted) return;
        setSubjects(unwrapList(s).map(simpleOpt));
        setPlans(unwrapList(l).map(normalizePlan));
        setErr("");
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Impossible de charger les plans mensuels.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [month]);

  // filters
  const shown = useMemo(() => {
    let arr = plans ?? [];
    if (subjectFilter) {
      arr = arr.filter((p) => String(p.subject?.id ?? p.subject_id) === String(subjectFilter));
    }
    return arr.sort((a, b) => String(a.plan_date).localeCompare(String(b.plan_date))
      || (toMins(a.start_time) ?? 0) - (toMins(b.start_time) ?? 0));
  }, [plans, subjectFilter]);

  const weekOffset = 0;
  const monday = useMemo(() => startOfWeekMonday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  // group by date for list
  const byDate = useMemo(() => {
    const m = new Map();
    for (const p of shown) {
      const k = p.plan_date ?? "";
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    }
    return m;
  }, [shown]);

  // submit
  const onSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      setSaving(true);
      const payload = normalizePayload(form);
      if (editingId) {
        await api.update(editingId, payload);
      } else {
        await api.create(payload);
      }
      // reload just this month
      const l = await api.list(month);
      setPlans(unwrapList(l).map(normalizePlan));
      setForm(blank);
      setEditingId(null);
      setErr("");
    } catch (e2) {
      console.error(e2);
      setErr(e2?.response?.data?.message || e2?.message || "Échec de l’enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (p) => {
    setEditingId(p.id);
    setForm({
      subject_id: p.subject?.id ?? p.subject_id ?? "",
      plan_date: p.plan_date ?? "",
      start_time: p.start_time ?? "",
      end_time: p.end_time ?? "",
      title: p.title ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (p) => {
    if (!p?.id) return;
    if (!confirm("Supprimer ce plan ?")) return;
    try {
      await api.remove(p.id);
      setPlans((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Suppression impossible");
    }
  };

  if (loading) return <div className="p-4 text-center">Chargement…</div>;

  return (
    <div className="p-4 space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Plans mensuels</h1>
          <div className="text-sm text-muted-foreground">
            Mois courant: {new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={month}
            onChange={setMonth}
            options={buildMonthOptions()}
          />
          <Select
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[{ value: "", label: "Toutes les matières" }, ...subjects.map(asOpt)]}
          />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60">
            Imprimer
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-red-300/50 bg-red-100/40 text-red-700 p-2 text-sm">{err}</div>
      ) : null}

      {/* form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <form onSubmit={onSubmit} className="rounded-xl border p-4 bg-background/60 space-y-3">
            <div className="text-sm font-semibold">
              {editingId ? "Modifier un plan" : "Ajouter un plan"}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledSelect
                label="Matière"
                value={form.subject_id}
                onChange={(v) => setForm({ ...form, subject_id: v })}
                options={subjects.map(asOpt)}
                required
              />
              <LabeledInput
                label="Date"
                value={form.plan_date}
                onChange={(v) => setForm({ ...form, plan_date: v })}
                placeholder="YYYY-MM-DD"
                type="date"
              />
              <LabeledInput
                label="Début (facultatif)"
                value={form.start_time}
                onChange={(v) => setForm({ ...form, start_time: v })}
                placeholder="09:00"
              />
              <LabeledInput
                label="Fin (facultatif)"
                value={form.end_time}
                onChange={(v) => setForm({ ...form, end_time: v })}
                placeholder="10:30"
              />
              <div className="sm:col-span-2">
                <LabeledInput
                    label="Titre (facultatif)"
                    value={form.title}
                    onChange={(v) => setForm({ ...form, title: v })}
                    placeholder="Ex: Contrôle, Atelier, Sortie…"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
              >
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(blank); }}
                  className="px-3 py-2 rounded-md border text-sm hover:bg-muted/60"
                >
                  Annuler
                </button>
              ) : null}
            </div>

            <TimeHint start={form.start_time} end={form.end_time} />
          </form>
        </div>

        {/* right section: week preview + list */}
        <div className="lg:col-span-2 space-y-4">
          <WeekPreview plans={shown} />
          <PlanList byDate={byDate} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

/* ------------------ small UI ------------------ */
function Select({ value, onChange, options }) {
  return (
    <select
      className="px-3 py-1.5 rounded-md border bg-background text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
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
function LabeledInput({ label, value, onChange, placeholder, type="text" }) {
  return (
    <label className="block">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border bg-background text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}
function TimeHint({ start, end }) {
  const sm = toMins(start);
  const em = toMins(end);
  if (!(sm != null && em != null && em > sm)) return null;
  return (
    <div className="text-xs text-muted-foreground">
      {`Plage: ${minsToHHMM(sm)}–${minsToHHMM(em)}`}
    </div>
  );
}

/* ------------------ list ------------------ */
function PlanList({ byDate, onEdit, onDelete }) {
  if (!byDate || !byDate.size) return (
    <div className="rounded-md border p-3 text-sm text-muted-foreground">
      Aucun plan sur ce mois.
    </div>
  );

  const days = [...byDate.keys()].sort();
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="divide-y">
        {days.map((d) => {
          const list = byDate.get(d) ?? [];
          return (
            <div key={d} className="p-3">
              <div className="text-sm font-semibold text-foreground/90 mb-2">
                {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((p) => {
                  const soft = subjectSoftBg(p);
                  const hard = subjectSolid(p);
                  const time = (p.start_time && p.end_time)
                    ? `${p.start_time}–${p.end_time}`
                    : (p.start_time ? p.start_time : (p.end_time ? p.end_time : "Sans horaire"));
                  return (
                    <div key={p.id} className="rounded-xl border p-3" style={{ background: soft, borderColor: "transparent" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: hard, color: "#fff" }}>
                            {p.subject?.name ?? p.subject_name ?? "Matière"}
                          </span>
                          {p.title ? <span className="ml-2 text-foreground/80">{p.title}</span> : null}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onEdit(p)} className="px-2 py-1 rounded-md border text-xs hover:bg-muted/60">Modifier</button>
                          <button onClick={() => onDelete(p)} className="px-2 py-1 rounded-md border text-xs hover:bg-muted/60">Supprimer</button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------ week preview (visualize current week only) ------------------ */
function WeekPreview({ plans }) {
  const monday = startOfWeekMonday(new Date());
  const items = (plans ?? []).filter((p) => {
    const d = new Date(`${p.plan_date}T00:00:00`);
    return !Number.isNaN(d) && inWeek(d, monday);
  });

  if (!items.length) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        Aucune planification dans la semaine en cours.
      </div>
    );
  }

  // calc vertical window from times if any
  let min = Infinity, max = -Infinity;
  for (const p of items) {
    const s = toMins(p.start_time); const e = toMins(p.end_time);
    if (s != null && e != null && e > s) { min = Math.min(min, s); max = Math.max(max, e); }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { min = 9*60; max = 12*60; }
  min = Math.max(7*60, Math.floor((min - 30)/30)*30);
  max = Math.min(22*60, Math.ceil((max + 30)/30)*30);
  if (max - min < 60) max = min + 60;
  const range = max - min;

  const byDay = new Map(DAYS.map((d) => [d.val, []]));
  for (const p of items) {
    const d = new Date(`${p.plan_date}T00:00:00`);
    const js = d.getDay(); const dow = js === 0 ? 7 : js;
    byDay.get(dow)?.push(p);
  }
  for (const [k, arr] of byDay) {
    arr.sort((a, b) => (toMins(a.start_time) ?? 0) - (toMins(b.start_time) ?? 0));
    byDay.set(k, arr);
  }

  const hourMarks = [];
  for (let m = min; m <= max; m += 60) hourMarks.push({ h: Math.floor(m/60), m });
  const halfHourMarks = [];
  for (let m = min + 30; m < max; m += 60) halfHourMarks.push(m);

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-muted/50 grid grid-cols-8 text-xs sm:text-sm sticky top-0 z-20">
        <div className="px-2 py-2 text-muted-foreground sticky left-0 bg-muted/50 z-30">Heure</div>
        {DAYS.map((d, i) => {
          const date = addDays(monday, i);
          const isToday = sameMonday(new Date(), monday) && (new Date().getDay() || 7) === d.val;
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
            const pct = ((m - min) / range) * 100;
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
          const list = byDay.get(d.val) ?? [];
          return (
            <div key={d.val} className="relative border-l bg-background/50">
              {hourMarks.map(({ m }) => {
                const pct = ((m - min) / range) * 100;
                return <div key={`h-${m}`} className="absolute left-0 right-0 h-px bg-border/50" style={{ top: `${pct}%` }} />;
              })}
              {halfHourMarks.map((m) => {
                const pct = ((m - min) / range) * 100;
                return <div key={`hh-${m}`} className="absolute left-0 right-0 h-px bg-border/30" style={{ top: `${pct}%` }} />;
              })}

              {list.map((p, i) => {
                const s = toMins(p.start_time); const e = toMins(p.end_time);
                const s2 = s != null ? Math.max(min, s) : min;
                const e2 = e != null ? Math.min(max, e) : Math.min(max, s2 + 45); // small pill if no end
                const topPct = ((s2 - min) / range) * 100;
                const heightPct = Math.max(((e2 - s2) / range) * 100, 0.8);
                const color = subjectSolid(p);
                const txt = (p.start_time && p.end_time) ? `${p.start_time}–${p.end_time}` : (p.start_time || p.end_time || "Sans horaire");
                return (
                  <div
                    key={p.id ?? `${d.val}-${i}`}
                    className="absolute rounded-lg text-[11px] sm:text-sm overflow-hidden"
                    style={{
                      top: `${topPct}%`,
                      left: "6px",
                      right: "6px",
                      height: `${heightPct}%`,
                      backgroundColor: color,
                      color: "#fff",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.18)"
                    }}
                    title={`${p.subject?.name ?? "Matière"}${p.title ? ` • ${p.title}` : ""} (${txt})`}
                  >
                    <div className="px-2 pt-1 font-semibold leading-tight truncate">
                      {p.subject?.name ?? p.subject_name ?? "Matière"}
                    </div>
                    <div className="px-2 text-[10px] sm:text-[11px] leading-tight">{txt}</div>
                    {p.title ? (
                      <div className="px-2 pb-1 text-[10px] sm:text-[11px] leading-tight truncate">
                        {p.title}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div style={{ height: `${range}px` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------ utils ------------------ */
function simpleOpt(it) {
  return { id: it?.id ?? it?.value ?? "", name: it?.name ?? it?.title ?? it?.label ?? `#${it?.id}` };
}
function asOpt(o) { return { value: o.id, label: o.name }; }
function normalizePlan(p) {
  return {
    ...p,
    plan_date: p?.plan_date ?? p?.date ?? "",
    subject: p?.subject?.id ? p.subject : (p?.subject_id ? { id: p.subject_id, name: p.subject_name ?? "Matière" } : p.subject),
    start_time: parseTimeLike(p?.start_time ?? p?.start ?? p?.starts_at),
    end_time: parseTimeLike(p?.end_time ?? p?.end ?? p?.ends_at),
    title: p?.title ?? p?.name ?? "",
  };
}
function normalizePayload(f) {
  if (!f.subject_id) throw new Error("Matière requise.");
  if (!f.plan_date) throw new Error("Date requise (YYYY-MM-DD).");

  const start = parseTimeLike(f.start_time);
  const end = parseTimeLike(f.end_time);
  if ((start && end) && toMins(end) <= toMins(start)) {
    throw new Error("Heures invalides (fin ≤ début).");
  }
  return {
    subject_id: Number(f.subject_id),
    plan_date: f.plan_date, // YYYY-MM-DD
    start_time: start ?? null,
    end_time: end ?? null,
    title: f.title?.trim() || null,
  };
}
function buildMonthOptions() {
  // show previous month, current, next two
  const out = [];
  const base = new Date();
  for (let k = -1; k <= 2; k++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + k);
    const v = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
    out.push({ value: v, label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) });
  }
  return out;
}
