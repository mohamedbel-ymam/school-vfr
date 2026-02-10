import React, { useEffect, useMemo, useState } from "react";
import { studentGradesApi } from "../../services/api/Student/StudentGradesServices";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

function clampNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

// Convert any (score/max) to /20
function to20(score, max) {
  const s = Number(score);
  const m = Number(max);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 20;
}

function fmt20(v) {
  if (v == null) return "—";
  return `${v.toFixed(2)}/20`;
}

export default function StudentNotesPage() {
  const [loading, setLoading] = useState(true);

  // [{ subject_name, grades: [] }]
  const [groups, setGroups] = useState([]);

  // overall summary computed from totals (weighted by max_score)
  const [summary, setSummary] = useState({
    avg20: null,
    count: 0,
    sumScore: 0,
    sumMax: 0,
  });

  const [term, setTerm] = useState("S1");

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentGradesApi.list({ term });

      // grouped grades (object: { "Math": [..], "Physique": [..] })
      const bySubjectObj = res?.data?.grades_by_subject ?? {};

      const normalized = Object.entries(bySubjectObj).map(
        ([subject_name, grades]) => ({
          subject_name,
          grades: Array.isArray(grades) ? grades : [],
        })
      );

      // sort subjects alphabetically
      normalized.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

      // sort each subject grades by date desc (safe)
      for (const b of normalized) {
        b.grades.sort((x, y) =>
          String(y?.graded_at ?? "").localeCompare(String(x?.graded_at ?? ""))
        );
      }

      // compute totals for weighted average (score/max then to /20)
      let sumScore = 0;
      let sumMax = 0;
      let count = 0;

      for (const block of normalized) {
        for (const g of block.grades) {
          const s = Number(g?.score);
          const m = Number(g?.max_score);
          if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) continue;
          sumScore += s;
          sumMax += m;
          count += 1;
        }
      }

      const avg20 = sumMax > 0 ? (sumScore / sumMax) * 20 : null;

      setGroups(normalized);
      setSummary({
        avg20,
        count,
        sumScore,
        sumMax,
      });
    } catch (e) {
      console.error(e);
      setGroups([]);
      setSummary({ avg20: null, count: 0, sumScore: 0, sumMax: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mes notes</h1>
          <div className="text-sm text-muted-foreground">
            Consultez vos notes par matière
          </div>
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
              {summary.avg20 == null ? "—" : `${summary.avg20.toFixed(2)}/20`}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Notes:{" "}
            <span className="font-medium text-foreground">{summary.count}</span>
            {" • "}
            Total:{" "}
            <span className="font-medium text-foreground">
              {clampNum(summary.sumScore).toFixed(2)}
            </span>{" "}
            /{" "}
            <span className="font-medium text-foreground">
              {clampNum(summary.sumMax).toFixed(2)}
            </span>
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
      ) : groups.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Aucune note pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((block) => (
            <Card key={block.subject_name} className="rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="font-semibold">{block.subject_name}</div>

                <div className="space-y-2">
                  {block.grades.map((g) => {
                    const note20 = to20(g.score, g.max_score);

                    return (
                      <div
                        key={g.id}
                        className="border rounded-xl p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {g.exam_type ?? "Évaluation"} —{" "}
                            <span className="opacity-80">
                              {g.score}/{g.max_score}
                            </span>
                            {" • "}
                            <span className="font-semibold">{fmt20(note20)}</span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {g.graded_at ?? ""}
                            {g.title ? ` • ${g.title}` : ""}
                          </div>

                          {g.comment ? (
                            <div className="text-sm mt-1">{g.comment}</div>
                          ) : null}
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
