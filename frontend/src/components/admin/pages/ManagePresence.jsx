// src/components/Admin/Pages/ManagePresence.jsx
import { useEffect, useMemo, useState } from "react";
import AttendanceApi from "../../../services/api/AttendanceApi";
import { axiosClient } from "../../../api/axios";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../ui/select";
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
    return {
      key: "danger",
      label: "Attention",
      className:
        "bg-amber-100 text-amber-700 border border-amber-200",
    };
  if (a >= 1 || total >= 3)
    return {
      key: "watch",
      label: "Surv.",
      className:
        "bg-yellow-100 text-yellow-700 border border-yellow-200",
    };
  return {
    key: "ok",
    label: "OK",
    className:
      "bg-green-100 text-green-700 border border-green-200",
  };
};

const rateFrom = (a, j, p) => {
  const A = clampNonNeg(a),
    J = clampNonNeg(j),
    P = clampNonNeg(p);
  const d = A + J + P;
  return d ? Math.round((P / d) * 100) : 0;
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

/* ----------------------------- compact stepper --------------------------- */
function Stepper({ value, onChange, min = 0, size = "sm", className = "" }) {
  const dec = () => onChange(Math.max(min, clampNonNeg(value - 1)));
  const inc = () => onChange(clampNonNeg(value + 1));

  const sz =
    size === "sm"
      ? {
          btn: "h-7 w-7",
          input: "w-10 h-7 text-xs",
          wrap: "rounded-md",
        }
      : {
          btn: "h-8 w-8",
          input: "w-12 h-8 text-sm",
          wrap: "rounded-lg",
        };

  return (
    <div
      className={`inline-flex items-center border bg-white overflow-hidden ${sz.wrap} ${className}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className={`${sz.btn} shrink-0 rounded-none`}
        onClick={dec}
        aria-label="Moins"
        type="button"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(clampNonNeg(+e.target.value))}
        className={`${sz.input} text-center outline-none border-x px-1`}
      />
      <Button
        variant="ghost"
        size="icon"
        className={`${sz.btn} shrink-0 rounded-none`}
        onClick={inc}
        aria-label="Plus"
        type="button"
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
  const [meta, setMeta] = useState({
    page: 1,
    per_page: 25,
    total: 0,
  });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("overall");
  const debouncedQ = useDebounced(q, 500);

  const [degrees, setDegrees] = useState([]);
  const [degreeId, setDegreeId] = useState("all");
  const [edits, setEdits] = useState({});

  const loadDegrees = async () => {
    try {
      const res = await axiosClient.get("/admin/degrees", {
        params: { per_page: 500 },
      });
      const list = unwrap(res);
      const items = Array.isArray(list) ? list : list.items ?? [];
      setDegrees(items.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      toast.error("Impossible de charger la liste des classes.");
    }
  };

  const fetchRows = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        q: debouncedQ,
        page,
        per_page: meta.per_page,
        period,
      };
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

  useEffect(() => {
    loadDegrees();
  }, []);

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, period, degreeId]);

  const pendingCount = useMemo(
    () => Object.keys(edits).length,
    [edits]
  );

  const baseFor = (r) => ({
    absences: clampNonNeg(r?.attendance?.absences ?? 0),
    justified_absences: clampNonNeg(
      r?.attendance?.justified_absences ?? 0
    ),
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
        absences: clampNonNeg(
          "absences" in patch
            ? patch.absences
            : prev.absences ?? 0
        ),
        justified_absences: clampNonNeg(
          "justified_absences" in patch
            ? patch.justified_absences
            : prev.justified_absences ?? 0
        ),
        presences: clampNonNeg(
          "presences" in patch
            ? patch.presences
            : prev.presences ?? 0
        ),
      };
      return { ...e, [studentId]: next };
    });
  };

  const setAbs = (r, v) => applyEdit(r.id, { absences: v });
  const setJust = (r, v) =>
    applyEdit(r.id, { justified_absences: v });
  const setPres = (r, v) => applyEdit(r.id, { presences: v });

  const resetEdits = () => setEdits({});

  const saveAll = async () => {
    if (!pendingCount) return;
    setSaving(true);
    try {
      // 1) Simple case: global only
      if (period === "overall") {
        const updates = Object.entries(edits).map(
          ([student_id, vals]) => ({
            student_id: +student_id,
            absences: clampNonNeg(vals.absences),
            justified_absences: clampNonNeg(
              vals.justified_absences
            ),
            presences: clampNonNeg(vals.presences),
            period: "overall",
          })
        );
        if (updates.length) {
          await AttendanceApi.bulkUpdate({
            updates,
            period: "overall",
          });
        }
        toast.success("Présences (global) mises à jour.");
        setEdits({});
        fetchRows(meta.page);
        return;
      }

      // 2) week or month + cascade
      const baseCurrentMap = new Map(
        rows.map((r) => [
          r.id,
          {
            absences: clampNonNeg(
              r?.attendance?.absences ?? 0
            ),
            justified_absences: clampNonNeg(
              r?.attendance?.justified_absences ?? 0
            ),
            presences: clampNonNeg(
              r?.attendance?.presences ?? 0
            ),
          },
        ])
      );

      const commonParams = {
        q: debouncedQ,
        page: meta.page,
        per_page: meta.per_page,
      };
      if (degreeId !== "all") {
        commonParams.degree_id = degreeId;
      }

      let monthMap = new Map();
      let overallMap = new Map();

      if (period === "week") {
        const [monthData, overallData] = await Promise.all([
          AttendanceApi.list({
            ...commonParams,
            period: "month",
          }),
          AttendanceApi.list({
            ...commonParams,
            period: "overall",
          }),
        ]);
        const toItems = (d) => d.items ?? d ?? [];
        monthMap = new Map(
          toItems(monthData).map((r) => [
            r.id,
            {
              absences: clampNonNeg(
                r?.attendance?.absences ?? 0
              ),
              justified_absences: clampNonNeg(
                r?.attendance?.justified_absences ?? 0
              ),
              presences: clampNonNeg(
                r?.attendance?.presences ?? 0
              ),
            },
          ])
        );
        overallMap = new Map(
          toItems(overallData).map((r) => [
            r.id,
            {
              absences: clampNonNeg(
                r?.attendance?.absences ?? 0
              ),
              justified_absences: clampNonNeg(
                r?.attendance?.justified_absences ?? 0
              ),
              presences: clampNonNeg(
                r?.attendance?.presences ?? 0
              ),
            },
          ])
        );
      }

      if (period === "month") {
        const overallData = await AttendanceApi.list({
          ...commonParams,
          period: "overall",
        });
        const toItems = (d) => d.items ?? d ?? [];
        overallMap = new Map(
          toItems(overallData).map((r) => [
            r.id,
            {
              absences: clampNonNeg(
                r?.attendance?.absences ?? 0
              ),
              justified_absences: clampNonNeg(
                r?.attendance?.justified_absences ?? 0
              ),
              presences: clampNonNeg(
                r?.attendance?.presences ?? 0
              ),
            },
          ])
        );
      }

      const updatesCurrent = [];
      const updatesMonth = [];
      const updatesOverall = [];

      for (const [studentIdStr, draft] of Object.entries(
        edits
      )) {
        const student_id = +studentIdStr;

        const newAbs = clampNonNeg(draft.absences);
        const newJust = clampNonNeg(draft.justified_absences);
        const newPres = clampNonNeg(draft.presences);

        const baseCurr =
          baseCurrentMap.get(student_id) || {
            absences: 0,
            justified_absences: 0,
            presences: 0,
          };

        const deltaAbs = newAbs - baseCurr.absences;
        const deltaJust =
          newJust - baseCurr.justified_absences;
        const deltaPres = newPres - baseCurr.presences;

        updatesCurrent.push({
          student_id,
          absences: newAbs,
          justified_absences: newJust,
          presences: newPres,
          period,
        });

        if (period === "week") {
          const baseMonth =
            monthMap.get(student_id) || {
              absences: 0,
              justified_absences: 0,
              presences: 0,
            };
          updatesMonth.push({
            student_id,
            absences: clampNonNeg(
              baseMonth.absences + deltaAbs
            ),
            justified_absences: clampNonNeg(
              baseMonth.justified_absences + deltaJust
            ),
            presences: clampNonNeg(
              baseMonth.presences + deltaPres
            ),
            period: "month",
          });
        }

        const baseOverall =
          overallMap.get(student_id) || {
            absences: 0,
            justified_absences: 0,
            presences: 0,
          };
        updatesOverall.push({
          student_id,
          absences: clampNonNeg(
            baseOverall.absences + deltaAbs
          ),
          justified_absences: clampNonNeg(
            baseOverall.justified_absences + deltaJust
          ),
          presences: clampNonNeg(
            baseOverall.presences + deltaPres
          ),
          period: "overall",
        });
      }

      if (updatesCurrent.length) {
        await AttendanceApi.bulkUpdate({
          updates: updatesCurrent,
          period,
        });
      }
      if (period === "week" && updatesMonth.length) {
        await AttendanceApi.bulkUpdate({
          updates: updatesMonth,
          period: "month",
        });
      }
      if (updatesOverall.length) {
        await AttendanceApi.bulkUpdate({
          updates: updatesOverall,
          period: "overall",
        });
      }

      toast.success(
        period === "week"
          ? "Semaine, mois et global mis à jour."
          : "Mois et global mis à jour."
      );
      setEdits({});
      fetchRows(meta.page);
    } catch (e) {
      console.error(e);
      toast.error("Échec de la sauvegarde (période + cumul).");
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
    const rate = denom
      ? Math.round((sumP / denom) * 100)
      : 0;
    return { sumA, sumJ, sumP, rate };
  }, [rows, edits, valueFor]);

  const generateFromTimetable = async () => {
    if (degreeId === "all") {
      toast.error("Veuillez choisir une classe avant de générer.");
      return;
    }
    try {
      setSaving(true);
      await AttendanceApi.generateFromTimetable({
        degree_id: degreeId,
      });
      toast.success(
        "Présences générées depuis l’emploi du temps !"
      );
      fetchRows(meta.page);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération.");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- UI ----------------------------------- */
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">
          Gestion des présences
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (élève, email, classe)"
            className="min-w-[220px] sm:w-64 flex-1"
          />

          <Button
            variant="secondary"
            onClick={generateFromTimetable}
            disabled={loading || degreeId === "all"}
            type="button"
          >
            Générer depuis l’emploi du temps
          </Button>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] whitespace-nowrap">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Global</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="week">
                Cette semaine
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(degreeId)}
            onValueChange={(v) => setDegreeId(v)}
          >
            <SelectTrigger className="w-[180px] whitespace-nowrap">
              <SelectValue placeholder="Classe / degré" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Toutes les classes
              </SelectItem>
              {degrees.map((d) => (
                <SelectItem
                  key={d.id}
                  value={String(d.id)}
                >
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
              type="button"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
            </Button>
            <Button
              onClick={saveAll}
              disabled={saving || !pendingCount}
              className="whitespace-nowrap"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer ({pendingCount})
            </Button>
            {pendingCount > 0 && (
              <Button
                variant="outline"
                onClick={resetEdits}
                disabled={saving}
                className="whitespace-nowrap"
                type="button"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Absences (non just.)
          </div>
          <div className="text-lg sm:text-2xl font-semibold">
            {totals.sumA}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Absences justifiées
          </div>
          <div className="text-lg sm:text-2xl font-semibold">
            {totals.sumJ}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Présences
          </div>
          <div className="text-lg sm:text-2xl font-semibold">
            {totals.sumP}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Taux de présence
          </div>
          <div className="text-lg sm:text-2xl font-semibold">
            {totals.rate}%
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="rounded-2xl border overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 bg-muted/40 p-3 text-sm font-medium">
          <div className="col-span-4 space-x-2">
            Élève • Statut
          </div>
          <div className="col-span-2">Classe</div>
          <div className="col-span-2">Absences</div>
          <div className="col-span-2">Abs. justifiées</div>
          <div className="col-span-1">Présences</div>
          <div className="col-span-1 text-right pr-1">
            Taux élève
          </div>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />{" "}
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-muted-foreground">
            Aucun élève trouvé.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r, idx) => {
              const abs = valueFor(r, "absences");
              const just = valueFor(
                r,
                "justified_absences"
              );
              const pres = valueFor(r, "presences");
              const st = statusFrom(abs, just);
              const rate = rateFrom(abs, just, pres);

              return (
                <div
                  key={r.id}
                  className={
                    idx % 2 ? "bg-muted/10" : "bg-white"
                  }
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-12 items-center p-3">
                    {/* Élève + Status */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
                        {(
                          (r.firstname?.[0] ?? "?") +
                          (r.lastname?.[0] ?? "")
                        ).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {r.firstname} {r.lastname}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.email}
                        </div>
                      </div>
                      <Badge
                        className={`shrink-0 ${st.className}`}
                      >
                        {st.label}
                      </Badge>
                    </div>

                    {/* Classe */}
                    <div className="col-span-2 text-sm truncate">
                      {r.degree?.name ??
                        r.classroom?.name ??
                        "—"}
                    </div>

                    {/* Absences */}
                    <div className="col-span-2">
                      <Stepper
                        value={abs}
                        onChange={(v) => setAbs(r, v)}
                        size="sm"
                      />
                    </div>

                    {/* Justifiées */}
                    <div className="col-span-2">
                      <Stepper
                        value={just}
                        onChange={(v) => setJust(r, v)}
                        size="sm"
                      />
                    </div>

                    {/* Presences (compact) */}
                    <div className="col-span-1">
                      <Stepper
                        value={pres}
                        onChange={(v) => setPres(r, v)}
                        size="sm"
                      />
                    </div>

                    {/* Rate */}
                    <div className="col-span-1 text-right pr-1">
                      <div className="font-medium">
                        {rate}%
                      </div>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
                          {(
                            (r.firstname?.[0] ?? "?") +
                            (r.lastname?.[0] ?? "")
                          ).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {r.firstname} {r.lastname}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.degree?.name ??
                              r.classroom?.name ??
                              "—"}
                          </div>
                        </div>
                      </div>
                      <Badge className={st.className}>
                        {st.label}
                      </Badge>
                    </div>

                    {/* Rate */}
                    <div className="rounded-xl border p-2 flex items-center justify-between">
                      <div className="text-[12px] text-muted-foreground">
                        Taux élève
                      </div>
                      <div className="text-sm font-semibold">
                        {rate}%
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">
                          Abs.
                        </div>
                        <Stepper
                          value={abs}
                          onChange={(v) => setAbs(r, v)}
                        />
                      </div>
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">
                          Just.
                        </div>
                        <Stepper
                          value={just}
                          onChange={(v) =>
                            setJust(r, v)
                          }
                        />
                      </div>
                      <div className="rounded-xl border p-2">
                        <div className="text-[11px] text-muted-foreground mb-1">
                          Prés.
                        </div>
                        <Stepper
                          value={pres}
                          onChange={(v) =>
                            setPres(r, v)
                          }
                        />
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
              type="button"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={
                loading ||
                meta.page * meta.per_page >= meta.total
              }
              onClick={() => fetchRows(meta.page + 1)}
              className="whitespace-nowrap"
              type="button"
            >
              Suivant
            </Button>
            {pendingCount > 0 && (
              <Button
                variant="outline"
                onClick={resetEdits}
                disabled={saving}
                className="whitespace-nowrap"
                type="button"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        Règle de statut : <b>Absences non justifiées</b> ≥ 3 ou
        (Abs. totales ≥ 5) →{" "}
        <span className="text-amber-600 font-medium">
          Attention
        </span>{" "}
        ; au moins 1 non justifiée ou totales ≥ 3 →{" "}
        <span className="text-yellow-600 font-medium">
          Surv.
        </span>{" "}
        ; sinon →{" "}
        <span className="text-green-600 font-medium">OK</span>.
      </p>

      {/* Mobile sticky action bar */}
      {pendingCount > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-20">
          <div className="rounded-2xl border bg-white/95 backdrop-blur p-2 shadow-lg flex gap-2">
            <Button
              variant="outline"
              className="w-1/3"
              onClick={resetEdits}
              disabled={saving}
              type="button"
            >
              Réinit.
            </Button>
            <Button
              className="w-2/3 whitespace-nowrap"
              onClick={saveAll}
              disabled={saving || !pendingCount}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer ({pendingCount})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
