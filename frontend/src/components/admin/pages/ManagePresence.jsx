// src/components/Admin/Pages/ManagePresence.jsx
import { useEffect, useMemo, useState } from "react";
import AttendanceApi from "../../../services/api/AttendanceApi";
import { axiosClient } from "../../../api/axios";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../ui/select";
import { toast } from "sonner";
import { Badge } from "../../ui/badge";
import { Loader2, Save, Plus, Minus, RefreshCw } from "lucide-react";

/* ------------------------------- helpers -------------------------------- */
const clampNonNeg = (n) => Math.max(0, Number.isFinite(+n) ? +n : 0);

const statusFrom = (unexcused, justified) => {
  const a = clampNonNeg(unexcused);
  const j = clampNonNeg(justified);
  const total = a + j;
  if (a >= 3 || total >= 5) return { key: "danger", label: "Danger", className: "bg-red-100 text-red-700 border border-red-200" };
  if (a >= 1 || total >= 3) return { key: "watch", label: "Attention", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { key: "ok", label: "Parfait", className: "bg-green-100 text-green-700 border border-green-200" };
};

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const unwrap = (r) => r?.data?.data ?? r?.data ?? [];

/* ----------------------------- compact stepper --------------------------- */
function Stepper({ value, onChange, min = 0, className = "" }) {
  const dec = () => onChange(Math.max(min, clampNonNeg(value - 1)));
  const inc = () => onChange(clampNonNeg(value + 1));
  return (
    <div className={`inline-flex items-center rounded-lg border bg-white overflow-hidden ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-none"
        onClick={dec}
        aria-label="Moins"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(clampNonNeg(+e.target.value))}
        className="w-12 h-8 text-center outline-none border-x px-1 text-sm"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-none"
        onClick={inc}
        aria-label="Plus"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ------------------------------- component ------------------------------ */
export default function ManagePresence() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 25, total: 0 });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("overall"); // overall | month | week
  const debouncedQ = useDebounced(q, 500);

  const [degrees, setDegrees] = useState([]);
  const [degreeId, setDegreeId] = useState("all");

  // drafts: { [student_id]: { absences, justified_absences, presences } }
  const [edits, setEdits] = useState({});

  const loadDegrees = async () => {
    try {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 500 } });
      const items = unwrap(res);
      const list = Array.isArray(items) ? items : items.items ?? [];
      setDegrees(list.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      toast.error("Impossible de charger la liste des classes.");
    }
  };

  const fetchRows = async (page = 1) => {
    setLoading(true);
    try {
      const params = { q: debouncedQ, page, per_page: meta.per_page, period };
      if (degreeId !== "all") params.degree_id = degreeId;
      const data = await AttendanceApi.list(params);
      const items = data.items ?? data ?? [];
      setRows(items);
      setMeta({
        page: data.meta?.page ?? page,
        per_page: data.meta?.per_page ?? meta.per_page,
        total: data.meta?.total ?? items.length,
      });
    } catch {
      toast.error("Impossible de charger les élèves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDegrees(); }, []);
  useEffect(() => { fetchRows(1); /* eslint-disable-next-line */ }, [debouncedQ, period, degreeId]);

  const pendingCount = useMemo(() => Object.keys(edits).length, [edits]);

  const baseFor = (r) => ({
    absences: clampNonNeg(r?.attendance?.absences ?? 0),
    justified_absences: clampNonNeg(r?.attendance?.justified_absences ?? 0),
    presences: clampNonNeg(r?.attendance?.presences ?? 0),
  });

  const valueFor = (r, key) => {
    const draft = edits[r.id];
    if (draft && key in draft) return clampNonNeg(draft[key]);
    return clampNonNeg(baseFor(r)[key] ?? 0);
  };

  const applyEdit = (studentId, patch) => {
    setEdits((e) => {
      const prev = e[studentId] ?? {};
      const next = {
        absences: clampNonNeg("absences" in patch ? patch.absences : prev.absences ?? baseFor({}).absences ?? 0),
        justified_absences: clampNonNeg("justified_absences" in patch ? patch.justified_absences : prev.justified_absences ?? baseFor({}).justified_absences ?? 0),
        presences: clampNonNeg("presences" in patch ? patch.presences : prev.presences ?? baseFor({}).presences ?? 0),
      };
      return { ...e, [studentId]: next };
    });
  };

  const setAbs = (r, v) => applyEdit(r.id, { absences: v });
  const setJust = (r, v) => applyEdit(r.id, { justified_absences: v });
  const setPres = (r, v) => applyEdit(r.id, { presences: v });
  const resetEdits = () => setEdits({});

  const saveAll = async () => {
    if (!pendingCount) return;
    setSaving(true);
    try {
      const updates = Object.entries(edits).map(([student_id, vals]) => ({
        student_id: +student_id,
        absences: clampNonNeg(vals.absences),
        justified_absences: clampNonNeg(vals.justified_absences),
        presences: clampNonNeg(vals.presences),
        period,
      }));
      await AttendanceApi.bulkUpdate({ updates, period });
      toast.success("Présences mises à jour.");
      setEdits({});
      fetchRows(meta.page);
    } catch {
      toast.error("Échec de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const list = rows.map((r) => ({
      a: valueFor(r, "absences"),
      j: valueFor(r, "justified_absences"),
      p: valueFor(r, "presences"),
    }));
    const sumA = list.reduce((s, x) => s + x.a, 0);
    const sumJ = list.reduce((s, x) => s + x.j, 0);
    const sumP = list.reduce((s, x) => s + x.p, 0);
    const denom = sumA + sumJ + sumP;
    const rate = denom ? Math.round((sumP / denom) * 100) : 0;
    return { sumA, sumJ, sumP, rate };
  }, [rows, edits]);

  /* ----------------------------- UI ----------------------------------- */
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Gestion des présences</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (élève, email, classe)"
            className="min-w-[220px] sm:w-64 flex-1"
          />

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] whitespace-nowrap">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Global</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(degreeId)} onValueChange={(v) => setDegreeId(v)}>
            <SelectTrigger className="w-[180px] whitespace-nowrap">
              <SelectValue placeholder="Classe / degré" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {degrees.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ms-auto flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => fetchRows(meta.page)}
              disabled={loading}
              className="whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir
            </Button>
            <Button
              onClick={saveAll}
              disabled={saving || !pendingCount}
              className="whitespace-nowrap"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer ({pendingCount})
            </Button>
            {pendingCount > 0 && (
              <Button variant="outline" onClick={resetEdits} disabled={saving} className="whitespace-nowrap">
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">Absences (non just.)</div>
          <div className="text-lg sm:text-2xl font-semibold">{totals.sumA}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">Absences justifiées</div>
          <div className="text-lg sm:text-2xl font-semibold">{totals.sumJ}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">Présences</div>
          <div className="text-lg sm:text-2xl font-semibold">{totals.sumP}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">Taux de présence</div>
          <div className="text-lg sm:text-2xl font-semibold">{totals.rate}%</div>
        </div>
      </div>

      {/* Table / List */}
      <div className="rounded-2xl border overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 bg-muted/40 p-3 text-sm font-medium">
          <div className="col-span-4">Élève</div>
          <div className="col-span-2">Classe</div>
          <div className="col-span-2">Absences</div>
          <div className="col-span-2">Abs. justifiées</div>
          <div className="col-span-1">Présences</div>
          <div className="col-span-1 text-right pr-1">Statut</div>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-muted-foreground">Aucun élève trouvé.</div>
        ) : (
          <div className="divide-y">
            {rows.map((r, idx) => {
              const abs = valueFor(r, "absences");
              const just = valueFor(r, "justified_absences");
              const pres = valueFor(r, "presences");
              const st = statusFrom(abs, just);

              return (
                <div key={r.id} className={`${idx % 2 ? "bg-muted/10" : "bg-white"}`}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-12 items-center p-3">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
                        {((r.firstname?.[0] ?? "?") + (r.lastname?.[0] ?? "")).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.firstname} {r.lastname}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                      </div>
                    </div>

                    <div className="col-span-2 text-sm truncate">{r.degree?.name ?? r.classroom?.name ?? "—"}</div>

                    <div className="col-span-2">
                      <Stepper value={abs} onChange={(v) => setAbs(r, v)} className="h-8" />
                    </div>

                    <div className="col-span-2">
                      <Stepper value={just} onChange={(v) => setJust(r, v)} className="h-8" />
                    </div>

                    <div className="col-span-1">
                      <Stepper value={pres} onChange={(v) => setPres(r, v)} className="h-8" />
                    </div>

                    <div className="col-span-1 text-right pr-1">
                      <Badge className={st.className}>{st.label}</Badge>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
                          {((r.firstname?.[0] ?? "?") + (r.lastname?.[0] ?? "")).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.firstname} {r.lastname}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.degree?.name ?? r.classroom?.name ?? "—"}</div>
                        </div>
                      </div>
                      <Badge className={st.className}>{st.label}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">Abs.</div>
                        <Stepper value={abs} onChange={(v) => setAbs(r, v)} />
                      </div>
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">Just.</div>
                        <Stepper value={just} onChange={(v) => setJust(r, v)} />
                      </div>
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">Prés.</div>
                        <Stepper value={pres} onChange={(v) => setPres(r, v)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {meta.total} élèves • page {meta.page}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetchRows(meta.page - 1)}
              className="whitespace-nowrap"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={loading || meta.page * meta.per_page >= meta.total}
              onClick={() => fetchRows(meta.page + 1)}
              className="whitespace-nowrap"
            >
              Suivant
            </Button>
            {pendingCount > 0 && (
              <Button variant="outline" onClick={resetEdits} disabled={saving} className="whitespace-nowrap">
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        Règle de statut : <b>Absences non justifiées</b> ≥ 3 ou (Abs. totales ≥ 5) →{" "}
        <span className="text-red-600 font-medium">Danger</span> ; au moins 1 non justifiée ou totales ≥ 3 →{" "}
        <span className="text-amber-600 font-medium">Attention</span> ; sinon →{" "}
        <span className="text-green-600 font-medium">Parfait</span>.
      </p>

      {/* Mobile sticky action bar */}
      {pendingCount > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-20">
          <div className="rounded-2xl border bg-white/95 backdrop-blur p-2 shadow-lg flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={resetEdits} disabled={saving}>
              Réinit.
            </Button>
            <Button className="w-2/3 whitespace-nowrap" onClick={saveAll} disabled={saving || !pendingCount}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer ({pendingCount})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
