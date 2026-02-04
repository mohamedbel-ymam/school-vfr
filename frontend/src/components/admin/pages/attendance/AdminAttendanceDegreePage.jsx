import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { toast } from "sonner";
import { adminAttendanceApi } from "../../../../services/api/admin/AdminAttendanceServices";

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function frDay(yyyyMMdd) {
  const d = new Date(`${yyyyMMdd}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function addDays(yyyyMMdd, n) {
  const d = new Date(`${yyyyMMdd}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function AdminAttendanceDegreePage() {
  const { degreeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const degreeNameFromNav = location.state?.degreeName;

  const [tab, setTab] = useState("adjust");
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [loading, setLoading] = useState(true);

  const [degreeName, setDegreeName] = useState(degreeNameFromNav || "");
  const [fromTo, setFromTo] = useState({ from: weekStart, to: addDays(weekStart, 6) });

  // raw records from backend
  const [records, setRecords] = useState([]);

  // dirty: recordId -> nextStatus
  const [dirty, setDirty] = useState({});
  const dirtyCount = Object.keys(dirty).length;

  async function load() {
    setLoading(true);
    setDirty({});
    try {
      const res = await adminAttendanceApi.weekly({
        degreeId: Number(degreeId),
        weekStart,
      });

      const payload = res.data;

      setFromTo({
        from: payload?.from ?? weekStart,
        to: payload?.to ?? addDays(weekStart, 6),
      });

      // backend does not return degree name here; keep from nav or show fallback
      setDegreeName(degreeNameFromNav || `Classe #${degreeId}`);

      setRecords(payload?.records ?? []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message ?? "Erreur chargement présences.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degreeId, weekStart]);

  // Build absence list directly from records
  const absenceList = useMemo(() => {
    const list = (records || [])
      .filter((r) => r?.status === "absence" || r?.status === "absence_justifiee")
      .map((r) => ({
        record_id: r.id,
        student_id: r.student_id,
        full_name: `${r?.student?.firstname ?? ""} ${r?.student?.lastname ?? ""}`.trim() || `#${r.student_id}`,
        date: r?.session?.session_date ?? "",
        status: r.status,
      }));

    list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.full_name.localeCompare(b.full_name)));
    return list;
  }, [records]);

  // Toggle locally (optimistic)
  function setLocal(recordId, nextStatus) {
    setDirty((prev) => ({ ...prev, [recordId]: nextStatus }));
    setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, status: nextStatus } : r)));
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

  // Results summary per student from records
  const resultsRows = useMemo(() => {
    const map = new Map();

    for (const r of records || []) {
      const sid = r.student_id;
      if (!map.has(sid)) {
        map.set(sid, {
          student_id: sid,
          full_name: `${r?.student?.firstname ?? ""} ${r?.student?.lastname ?? ""}`.trim() || `#${sid}`,
          presence: 0,
          absence: 0,
          just: 0,
        });
      }
      const row = map.get(sid);
      if (r.status === "presence") row.presence += 1;
      if (r.status === "absence") row.absence += 1;
      if (r.status === "absence_justifiee") row.just += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [records]);

  function exportWeekRaw() {
    const url = adminAttendanceApi.exportRangeUrl({
      degreeId: Number(degreeId),
      from: fromTo.from,
      to: fromTo.to,
    });
    window.open(url, "_blank");
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground">Classe</div>
          <div className="text-xl font-semibold">{degreeName}</div>
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

          <Button variant="outline" onClick={() => navigate("/admin/presences")}>
            Retour
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("adjust")}
          className={`rounded-2xl border px-4 py-3 text-left ${tab === "adjust" ? "bg-black text-white" : ""}`}
        >
          <div className="font-semibold">Ajuster</div>
          <div className="text-sm opacity-70">Justifier des absences</div>
        </button>

        <button
          onClick={() => setTab("results")}
          className={`rounded-2xl border px-4 py-3 text-left ${tab === "results" ? "bg-black text-white" : ""}`}
        >
          <div className="font-semibold">Résultats</div>
          <div className="text-sm opacity-70">Prêt à exporter</div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {loading ? "Chargement…" : `${records.length} enregistrements`}
          {dirtyCount ? ` • Modifs: ${dirtyCount}` : ""}
        </div>

        <div className="flex items-center gap-2">
          {tab === "adjust" ? (
            <Button onClick={save} disabled={loading || dirtyCount === 0}>
              Enregistrer
            </Button>
          ) : (
            <Button variant="secondary" onClick={exportWeekRaw} disabled={loading}>
              Export Excel
            </Button>
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
                <div key={a.record_id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.full_name}</div>
                    <div className="text-sm opacity-70">
                      {a.date ? frDay(a.date) : "—"} •{" "}
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
                          setLocal(a.record_id, next);
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
            Export actuel = export brut (par enregistrement) sur la semaine.
          </div>
        </div>
      )}
    </div>
  );
}
