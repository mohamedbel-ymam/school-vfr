import React, { useEffect, useMemo, useState } from "react";
import { studentGradesApi } from "../../services/api/Student/StudentGradesServices";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

function pct(score, max) {
  const s = Number(score);
  const m = Number(max);
  if (!m || m <= 0) return null;
  return (s / m) * 100;
}

export default function StudentNotesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [term, setTerm] = useState("S1");

  const load = async () => {
    setLoading(true);
    try {
      // backend should return only current student grades
      const res = await studentGradesApi.list({ term, per_page: 200 });
      const rows = res.data?.data ?? res.data?.data?.data ?? [];
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const summary = useMemo(() => {
    let sumScore = 0;
    let sumMax = 0;
    for (const g of items) {
      const s = Number(g.score);
      const m = Number(g.max_score);
      if (!m || m <= 0) continue;
      sumScore += s;
      sumMax += m;
    }
    const totalPct = sumMax > 0 ? (sumScore / sumMax) * 100 : null;
    return { sumScore, sumMax, totalPct, count: items.length };
  }, [items]);

  const bySubject = useMemo(() => {
    const map = new Map();
    for (const g of items) {
      const sid = g.subject_id;
      const name = g.subject?.name ?? `Matière #${sid}`;
      if (!map.has(sid)) map.set(sid, { subject_id: sid, subject_name: name, grades: [] });
      map.get(sid).grades.push(g);
    }
    // sort grades by date desc
    for (const v of map.values()) {
      v.grades.sort((a, b) => String(b.graded_at ?? "").localeCompare(String(a.graded_at ?? "")));
    }
    return Array.from(map.values()).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }, [items]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mes notes</h1>
          <div className="text-sm text-muted-foreground">Consultez vos notes par matière</div>
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

      {/* Summary */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Moyenne générale</div>
            <div className="text-2xl font-semibold">
              {summary.totalPct == null ? "—" : `${summary.totalPct.toFixed(1)}%`}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Notes: <span className="font-medium text-foreground">{summary.count}</span>
            {" • "}
            Total: <span className="font-medium text-foreground">{summary.sumScore.toFixed(2)}</span> /
            <span className="font-medium text-foreground"> {summary.sumMax.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bySubject.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucune note pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {bySubject.map((block) => (
            <Card key={block.subject_id} className="rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="font-semibold">{block.subject_name}</div>

                <div className="space-y-2">
                  {block.grades.map((g) => {
                    const p = pct(g.score, g.max_score);
                    return (
                      <div key={g.id} className="border rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {g.exam_type ?? "Examen"} — {g.score}/{g.max_score}
                            {p == null ? "" : ` • ${p.toFixed(1)}%`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {g.graded_at ?? ""}
                            {g.title ? ` • ${g.title}` : ""}
                          </div>
                          {g.comment ? <div className="text-sm mt-1">{g.comment}</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
