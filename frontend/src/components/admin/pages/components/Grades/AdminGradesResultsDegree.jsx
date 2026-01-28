import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../../../api/axios";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";

function avg20(totalScore, totalMax) {
  const s = Number(totalScore);
  const m = Number(totalMax);
  if (!m || m <= 0) return null;
  return (s / m) * 20;
}

export default function AdminGradesResultsDegree() {
  const { degreeId } = useParams();

  const [term, setTerm] = useState("S1");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get(`/admin/degrees/${degreeId}/grades-leaderboard`, {
          params: { limit: 200, term },
        });

        const data = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;

        setRows(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [degreeId, term]);

  const tableRows = useMemo(() => {
    return (rows || []).map((r, idx) => {
      const m20 = avg20(r.total_score, r.total_max);
      return {
        rank: idx + 1,
        id: r.id,
        name: r.name ?? `#${r.id}`,
        grades_count: r.grades_count ?? 0,
        moyenne20: m20,
        total_score: r.total_score ?? 0,
        total_max: r.total_max ?? 0,
      };
    });
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Résultats — Degré #{degreeId}</h1>
          <p className="text-sm text-muted-foreground">Classement par moyenne générale sur 20.</p>
        </div>

        <div className="w-[160px]">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S1">S1</SelectItem>
              <SelectItem value="S2">S2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Tableau de classement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Aucune donnée.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr className="text-left">
                    <th className="p-3 w-[80px]">Rang</th>
                    <th className="p-3">Élève</th>
                    <th className="p-3 w-[120px]">Notes</th>
                    <th className="p-3 w-[160px]">Moyenne / 20</th>
                    <th className="p-3 w-[160px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.rank}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{r.grades_count}</td>
                      <td className="p-3 font-semibold">
                        {r.moyenne20 == null ? "—" : `${r.moyenne20.toFixed(2)} / 20`}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {Number(r.total_score).toFixed(2)} / {Number(r.total_max).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
