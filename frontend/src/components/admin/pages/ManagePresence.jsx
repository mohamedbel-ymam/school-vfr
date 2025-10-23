import { useEffect, useMemo, useState } from "react";
import AttendanceApi from "../../../services/api/AttendenceApi"; // ✅ fixed path
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

/* ------------------------------- component ------------------------------ */
export default function ManagePresence() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 25, total: 0 });
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("overall"); // overall | month | week
  const debouncedQ = useDebounced(q, 500);
  // drafts: { [student_id]: { absences, justified_absences, presences } }
  const [edits, setEdits] = useState({});

  const fetchRows = async (page = 1) => {
    setLoading(true);
    try {
      const data = await AttendanceApi.list({ q: debouncedQ, page, per_page: meta.per_page, period });
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
    fetchRows(1); // eslint-disable-next-line
  }, [debouncedQ, period]);

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

  const inc = (r, field, step = 1) => {
    const next = valueFor(r, field) + step;
    applyEdit(r.id, { [field]: next });
  };

  const dec = (r, field, step = 1) => {
    const next = Math.max(0, valueFor(r, field) - step);
    applyEdit(r.id, { [field]: next });
  };

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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Gestion des présences</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher élève, email, classe…"
            className="w-64"
          />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">Global</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={() => fetchRows(meta.page)} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
          </Button>

          <Button onClick={saveAll} disabled={saving || !pendingCount}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer ({pendingCount})
          </Button>

          {pendingCount > 0 && (
            <Button variant="outline" onClick={resetEdits} disabled={saving}>
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-muted-foreground">Absences (non just.)</div>
          <div className="text-2xl font-semibold">{totals.sumA}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-muted-foreground">Absences justifiées</div>
          <div className="text-2xl font-semibold">{totals.sumJ}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-muted-foreground">Présences</div>
          <div className="text-2xl font-semibold">{totals.sumP}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-muted-foreground">Taux de présence</div>
          <div className="text-2xl font-semibold">{totals.rate}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted/40 p-3 text-sm font-medium">
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
          rows.map((r, idx) => {
            const abs = valueFor(r, "absences");
            const just = valueFor(r, "justified_absences");
            const pres = valueFor(r, "presences");
            const st = statusFrom(abs, just);
            return (
              <div
                key={r.id}
                className={`grid grid-cols-12 items-center p-3 ${idx % 2 ? "bg-muted/10" : "bg-white"}`}
              >
                {/* Student */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 grid place-content-center font-semibold">
                    {((r.firstname?.[0] ?? "?") + (r.lastname?.[0] ?? "")).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {r.firstname} {r.lastname}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                  </div>
                </div>

                {/* Degree/Class */}
                <div className="col-span-2 text-sm">{r.degree?.name ?? r.classroom?.name ?? "—"}</div>

                {/* Unexcused absences */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => dec(r, "absences")}>
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
                    <Button variant="outline" size="icon" onClick={() => inc(r, "absences")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Justified absences */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => dec(r, "justified_absences")}>
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
                    <Button variant="outline" size="icon" onClick={() => inc(r, "justified_absences")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Presences */}
                <div className="col-span-1">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => dec(r, "presences")}>
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
                    <Button variant="outline" size="icon" onClick={() => inc(r, "presences")}>
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
          })
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {meta.total} élèves • page {meta.page}
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Règle de statut : <b>Absences non justifiées</b> ≥ 3 ou (Abs. totales ≥ 5) →{" "}
        <span className="text-red-600 font-medium">Danger</span> ; au moins 1 non justifiée ou totales ≥ 3 →{" "}
        <span className="text-amber-600 font-medium">Attention</span> ; sinon →{" "}
        <span className="text-green-600 font-medium">Parfait</span>.
      </p>
    </div>
  );
}
