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
  if (a >= 3 || total >= 5)
    return { key: "danger", label: "Danger", className: "bg-red-100 text-red-700 border border-red-200" };
  if (a >= 1 || total >= 3)
    return { key: "watch", label: "Attention", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { key: "ok", label: "Parfait", className: "bg-green-100 text-green-700 border border-green-200" };
};

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const unwrap = (r) => r?.data?.data ?? r?.data ?? [];

/* ------------------------------- component ------------------------------ */
export default function ManagePresence() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 25, total: 0 });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("overall"); // overall | month | week
  const debouncedQ = useDebounced(q, 500);

  // Degrees (classes) filter
  const [degrees, setDegrees] = useState([]);
  const [degreeId, setDegreeId] = useState("all"); // "all" | <id>

  // drafts: { [student_id]: { absences, justified_absences, presences } }
  const [edits, setEdits] = useState({});

  const loadDegrees = async () => {
    try {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 500 } });
      const items = unwrap(res);
      const list = Array.isArray(items) ? items : (items.items ?? []);
      setDegrees(list.map((d) => ({ id: d.id, name: d.name })));
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger la liste des élèves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDegrees();
  }, []);

  useEffect(() => {
    fetchRows(1); // eslint-disable-next-line
  }, [debouncedQ, period, degreeId]);

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
        absences: clampNonNeg("absences" in patch ? patch.absences : prev.absences ?? 0),
        justified_absences: clampNonNeg(
          "justified_absences" in patch ? patch.justified_absences : prev.justified_absences ?? 0
        ),
        presences: clampNonNeg("presences" in patch ? patch.presences : prev.presences ?? 0),
      };
      return { ...e, [studentId]: next };
    });
  };

  const inc = (r, field, step = 1) => applyEdit(r.id, { [field]: valueFor(r, field) + step });
  const dec = (r, field, step = 1) => applyEdit(r.id, { [field]: Math.max(0, valueFor(r, field) - step) });
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
    } catch (e) {
      console.error(e);
      toast.error("Échec de la sauvegarde. Veuillez réessayer.");
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
  const Toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl sm:text-2xl font-semibold">Gestion des présences</h1>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 w-full sm:w-auto">
        {/* Search full-width on mobile */}
        <div className="sm:col-span-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (élève, email, classe)"
            className="w-full"
          />
        </div>

        {/* Period */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Global</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
          </SelectContent>
        </Select>

        {/* Degree */}
        <Select value={String(degreeId)} onValueChange={(v) => setDegreeId(v)}>
          <SelectTrigger className="w-full">
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

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fetchRows(meta.page)} disabled={loading} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Rafraîchir</span>
            <span className="sm:hidden">Rafraîchir</span>
          </Button>
          <Button onClick={saveAll} disabled={saving || !pendingCount} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Enregistrer</span> ({pendingCount})
          </Button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="sm:hidden">
          <Button variant="outline" onClick={resetEdits} disabled={saving} className="w-full">
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );

  const SummaryCards = (
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
  );

  const RowDesktop = (r, idx) => {
    const abs = valueFor(r, "absences");
    const just = valueFor(r, "justified_absences");
    const pres = valueFor(r, "presences");
    const st = statusFrom(abs, just);
    return (
      <div
        key={r.id}
        className={`hidden md:grid grid-cols-12 items-center p-3 ${idx % 2 ? "bg-muted/10" : "bg-white"}`}
      >
        {/* Student */}
        <div className="col-span-4 flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
            {((r.firstname?.[0] ?? "?") + (r.lastname?.[0] ?? "")).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{r.firstname} {r.lastname}</div>
            <div className="text-xs text-muted-foreground truncate">{r.email}</div>
          </div>
        </div>

        {/* Degree/Class */}
        <div className="col-span-2 text-sm">{r.degree?.name ?? r.classroom?.name ?? "—"}</div>

        {/* Unexcused absences */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => dec(r, "absences")} aria-label="Moins absence">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              className="w-20 text-center"
              min={0}
              value={abs}
              onChange={(e) => applyEdit(r.id, { absences: e.target.value })}
            />
            <Button variant="outline" size="icon" onClick={() => inc(r, "absences")} aria-label="Plus absence">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Justified absences */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => dec(r, "justified_absences")} aria-label="Moins abs. just.">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              className="w-20 text-center"
              min={0}
              value={just}
              onChange={(e) => applyEdit(r.id, { justified_absences: e.target.value })}
            />
            <Button variant="outline" size="icon" onClick={() => inc(r, "justified_absences")} aria-label="Plus abs. just.">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Presences */}
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => dec(r, "presences")} aria-label="Moins présence">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              className="w-16 text-center"
              min={0}
              value={pres}
              onChange={(e) => applyEdit(r.id, { presences: e.target.value })}
            />
            <Button variant="outline" size="icon" onClick={() => inc(r, "presences")} aria-label="Plus présence">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="col-span-1 text-right pr-1">
          <Badge className={st.className}>{st.label}</Badge>
        </div>
      </div>
    );
  };

  const RowMobileCard = (r) => {
    const abs = valueFor(r, "absences");
    const just = valueFor(r, "justified_absences");
    const pres = valueFor(r, "presences");
    const st = statusFrom(abs, just);

    return (
      <div key={r.id} className="md:hidden rounded-xl border p-3 bg-white space-y-3">
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

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2">
          {/* A */}
          <div className="rounded-xl border p-2">
            <div className="text-[11px] text-muted-foreground mb-1">Absences</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => dec(r, "absences")} aria-label="Moins absence">
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                className="w-full text-center"
                min={0}
                value={abs}
                onChange={(e) => applyEdit(r.id, { absences: e.target.value })}
              />
              <Button variant="outline" size="icon" onClick={() => inc(r, "absences")} aria-label="Plus absence">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* J */}
          <div className="rounded-xl border p-2">
            <div className="text-[11px] text-muted-foreground mb-1">Justifiées</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => dec(r, "justified_absences")} aria-label="Moins justifiées">
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                className="w-full text-center"
                min={0}
                value={just}
                onChange={(e) => applyEdit(r.id, { justified_absences: e.target.value })}
              />
              <Button variant="outline" size="icon" onClick={() => inc(r, "justified_absences")} aria-label="Plus justifiées">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* P */}
          <div className="rounded-xl border p-2">
            <div className="text-[11px] text-muted-foreground mb-1">Présences</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => dec(r, "presences")} aria-label="Moins présence">
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                className="w-full text-center"
                min={0}
                value={pres}
                onChange={(e) => applyEdit(r.id, { presences: e.target.value })}
              />
              <Button variant="outline" size="icon" onClick={() => inc(r, "presences")} aria-label="Plus présence">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {Toolbar}

      {SummaryCards}

      {/* Desktop header */}
      <div className="rounded-2xl border overflow-hidden">
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
          <div className="space-y-2 md:space-y-0">
            {rows.map((r, idx) => (
              <div key={r.id}>
                {RowDesktop(r, idx)}
                {RowMobileCard(r)}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {meta.total} élèves • page {meta.page}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={meta.page <= 1 || loading}
              onClick={() => fetchRows(meta.page - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={loading || meta.page * meta.per_page >= meta.total}
              onClick={() => fetchRows(meta.page + 1)}
            >
              Suivant
            </Button>

            {/* Desktop-only Reset when there are edits */}
            {pendingCount > 0 && (
              <Button variant="outline" onClick={resetEdits} disabled={saving} className="hidden sm:inline-flex">
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

      {/* Mobile sticky action bar when there are edits */}
      {pendingCount > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-20">
          <div className="rounded-2xl border bg-white/95 backdrop-blur p-2 shadow-lg flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={resetEdits} disabled={saving}>
              Réinitialiser
            </Button>
            <Button className="w-2/3" onClick={saveAll} disabled={saving || !pendingCount}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer ({pendingCount})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
