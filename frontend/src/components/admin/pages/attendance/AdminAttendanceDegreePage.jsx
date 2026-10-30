// src/components/admin/pages/attendance/AdminAttendanceDegreePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { toast } from "sonner";
import { adminAttendanceApi } from "../../../../services/api/admin/AdminAttendanceServices";
import { attendanceScanApi } from "../../../../services/api/admin/AttendanceScanApi";
import { Printer, FileScan, RefreshCw } from "lucide-react";

/* ------------------------- date helpers ------------------------- */
function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function addDays(yyyyMMdd, n) {
  const d = new Date(`${yyyyMMdd}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function frDay(yyyyMMdd) {
  const d = new Date(`${yyyyMMdd}T00:00:00`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function AdminAttendanceDegreePage() {
  const { degreeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const degreeNameFromNav = location.state?.degreeName;

  const [tab, setTab] = useState("adjust"); // "adjust" | "results"
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [loading, setLoading] = useState(true);

  const [weekDays, setWeekDays] = useState([]);
  const [rows, setRows] = useState([]);
  const [degreeName, setDegreeName] = useState(degreeNameFromNav || "");

  // Dirty: recordId -> newStatus
  const [dirty, setDirty] = useState({});
  const dirtyCount = Object.keys(dirty).length;
  const [printingPdf, setPrintingPdf] = useState(false);

  const daysOfWeek = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  async function load() {
    setLoading(true);
    setDirty({});
    try {
      // ✅ ensure record_id exists for each day (so admin can toggle later)
      await Promise.all(
        daysOfWeek.map((date) =>
          adminAttendanceApi
            .backfill({
              degreeId: Number(degreeId),
              date,
              defaultStatus: "not_marked",
              onlyMissing: true,
            })
            .catch(() => null)
        )
      );

      // ✅ fetch weekly matrix
      const res = await adminAttendanceApi.weekly({
        degreeId: Number(degreeId),
        weekStart,
      });

      const payload = res.data;

      setDegreeName(payload?.degree?.name ?? degreeNameFromNav ?? "");
      setWeekDays(payload?.week?.days ?? daysOfWeek);
      setRows(payload?.rows ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message ?? "Erreur chargement présences.");
      setWeekDays([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degreeId, weekStart]);

  // Build list of absences to adjust
  const absenceList = useMemo(() => {
    const list = [];
    for (const r of rows) {
      for (const d of weekDays) {
        const cell = r.days?.[d];
        if (!cell?.record_id) continue;

        if (cell.status === "absence" || cell.status === "absence_justifiee") {
          list.push({
            student_id: r.student_id,
            full_name: r.full_name,
            date: d,
            record_id: cell.record_id,
            status: cell.status,
          });
        }
      }
    }
    list.sort((a, b) =>
      a.date > b.date ? 1 : a.date < b.date ? -1 : a.full_name.localeCompare(b.full_name)
    );
    return list;
  }, [rows, weekDays]);

  // Update a cell locally + dirty map
  function setCell(recordId, studentId, date, status) {
    setDirty((prev) => ({ ...prev, [recordId]: status }));

    setRows((prev) =>
      prev.map((r) => {
        if (r.student_id !== studentId) return r;

        const oldCell = r.days?.[date] ?? { record_id: recordId, status: "not_marked" };
        const nextDays = {
          ...(r.days ?? {}),
          [date]: { ...oldCell, record_id: recordId, status },
        };

        // recompute counts
        const statuses = Object.values(nextDays).map((c) => c.status);
        const presence = statuses.filter((s) => s === "presence").length;
        const absence = statuses.filter((s) => s === "absence").length;
        const just = statuses.filter((s) => s === "absence_justifiee").length;

        return {
          ...r,
          days: nextDays,
          counts: { presence, absence, absence_justifiee: just },
        };
      })
    );
  }

  async function save() {
    if (!dirtyCount) {
      toast.message("Aucune modification.");
      return;
    }

    const entries = Object.entries(dirty);
    toast.message(`Enregistrement (${entries.length})…`);

    const results = await Promise.allSettled(
      entries.map(([recordId, status]) => adminAttendanceApi.updateRecordStatus(recordId, status))
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const ko = results.length - ok;

    if (ko === 0) {
      toast.success(`Enregistré (${ok}).`);
      setDirty({});
      await load();
      setTab("results");
    } else {
      toast.error(`Partiel: ${ok} OK, ${ko} erreurs.`);
    }
  }

  function exportWeekRaw() {
    const from = weekStart;
    const to = addDays(weekStart, 6);
    const url = adminAttendanceApi.exportRangeUrl({
      degreeId: Number(degreeId),
      from,
      to,
    });
    window.open(url, "_blank");
  }

  function exportWeekSummary() {
    const from = weekStart;
    const to = addDays(weekStart, 6);
    const url = adminAttendanceApi.exportWeeklySummaryUrl({
      degreeId: Number(degreeId),
      from,
      to,
    });
    window.open(url, "_blank");
  }

  async function handlePrintPdf() {
    setPrintingPdf(true);
    try {
      await attendanceScanApi.openWeeklyPdf({
        degreeId: Number(degreeId),
        date: weekStart,
      });
      toast.success("Fiche d'émargement A4 générée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de la génération de la fiche A4."
      );
    } finally {
      setPrintingPdf(false);
    }
  }
  const resultsRows = useMemo(() => {
    return rows.map((r) => ({
      student_id: r.student_id,
      full_name: r.full_name,
      presence: r.counts?.presence ?? 0,
      absence: r.counts?.absence ?? 0,
      just: r.counts?.absence_justifiee ?? 0,
    }));
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground">Classe</div>
          <div className="text-xl font-semibold">{degreeName || `Classe #${degreeId}`}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Semaine (lundi)</div>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="border rounded-xl px-3 py-2"
            />
          </div>

          <Button
            size="sm"
            variant="secondary"
            disabled={printingPdf}
            onClick={handlePrintPdf}
            className="rounded-xl flex items-center gap-1.5 text-xs font-semibold border shadow-xs"
          >
            {printingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                Génération PDF...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 text-primary" />
                Imprimer Fiche A4
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/admin/presences/scanner?degree_id=${degreeId}`)}
            className="rounded-xl flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            <FileScan className="w-3.5 h-3.5" />
            Scanner la Feuille
          </Button>

          <Button variant="outline" onClick={() => navigate("/admin/presences")}>
            Retour
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("adjust")}
          className={`rounded-2xl border px-4 py-3 text-left ${
            tab === "adjust" ? "bg-black text-white" : ""
          }`}
        >
          <div className="font-semibold">Ajuster</div>
          <div className="text-sm opacity-70">Justifier des absences</div>
        </button>

        <button
          onClick={() => setTab("results")}
          className={`rounded-2xl border px-4 py-3 text-left ${
            tab === "results" ? "bg-black text-white" : ""
          }`}
        >
          <div className="font-semibold">Résultats</div>
          <div className="text-sm opacity-70">Prêt à exporter</div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {loading ? "Chargement…" : `${rows.length} élèves`}
          {dirtyCount ? ` • Modifs: ${dirtyCount}` : ""}
        </div>

        <div className="flex items-center gap-2">
          {tab === "adjust" ? (
            <Button onClick={save} disabled={loading || dirtyCount === 0}>
              Enregistrer
            </Button>
          ) : (
            <>
              {/* ✅ Prefer summary export */}
              <Button variant="secondary" onClick={exportWeekSummary} disabled={loading}>
                Export (Résumé)
              </Button>

              {/* optional raw export */}
              <Button variant="outline" onClick={exportWeekRaw} disabled={loading}>
                Export (Brut)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-6 text-center opacity-70">Chargement…</div>
      ) : tab === "adjust" ? (
        <div className="border rounded-2xl overflow-hidden">
          <div className="p-3 border-b bg-muted/40">
            <div className="font-semibold">Liste des absences</div>
            <div className="text-sm opacity-70">
              Cochez “Justifiée” pour transformer une absence en absence justifiée.
            </div>
          </div>

          {absenceList.length === 0 ? (
            <div className="p-6 text-center opacity-70">Aucune absence cette semaine.</div>
          ) : (
            <div className="divide-y">
              {absenceList.map((a) => (
                <div
                  key={a.record_id}
                  className="p-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.full_name}</div>
                    <div className="text-sm opacity-70">
                      {frDay(a.date)} •{" "}
                      {a.status === "absence_justifiee" ? "Absence justifiée" : "Absence"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={a.status === "absence_justifiee"}
                        onChange={(e) => {
                          const next = e.target.checked ? "absence_justifiee" : "absence";
                          setCell(a.record_id, a.student_id, a.date, next);
                        }}
                      />
                      Justifiée
                    </label>

                    <span className="text-xs opacity-70">#{a.record_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-2xl overflow-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left p-3 min-w-[260px]">Élève</th>
                <th className="text-center p-3">Présence</th>
                <th className="text-center p-3">Absence</th>
                <th className="text-center p-3">Justifiée</th>
              </tr>
            </thead>
            <tbody>
              {resultsRows.map((r) => (
                <tr key={r.student_id} className="border-b last:border-b-0">
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3 text-center">{r.presence}</td>
                  <td className="p-3 text-center">{r.absence}</td>
                  <td className="p-3 text-center">{r.just}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 text-sm opacity-70">
            “Export (Résumé)” génère 1 ligne par élève avec les compteurs (présence/absence/justifiée).
          </div>
        </div>
      )}
    </div>
  );
}
