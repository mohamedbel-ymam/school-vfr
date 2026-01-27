import React, { useEffect, useMemo, useState } from "react";
import { studentRatingsApi } from "../../services/api/Student/StudentRatingsServices";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

function StarsLine({ value }) {
  const v = Number(value || 0);
  const n = Math.round(v);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={16} className={i <= n ? "fill-current" : ""} />
      ))}
      <span className="text-xs text-muted-foreground ml-2">{value == null ? "—" : v.toFixed(2)}</span>
    </div>
  );
}

export default function StudentDisciplinePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [term, setTerm] = useState("S1");

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentRatingsApi.list({ term, per_page: 50 });
      // paginator contains rows in data
      const items = res.data?.data ?? res.data?.data?.data ?? [];
      setRows(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const latest = useMemo(() => {
    if (!rows.length) return null;
    // rows are ordered by period desc in backend; take first
    return rows[0];
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Discipline ⭐</h1>
          <div className="text-sm text-muted-foreground">
            Résultat global (sans afficher qui a noté)
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

      {/* Latest summary */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Dernier mois</div>
            <div className="text-sm text-muted-foreground">{latest?.period ?? "—"}</div>
            <div className="mt-2">
              <StarsLine value={latest?.avg_all_stars} />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Enseignants: <span className="font-medium text-foreground">{latest?.teacher_count ?? 0}</span>
            {" • "}
            Admin: <span className="font-medium text-foreground">{latest?.admin_count ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* History */}
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
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucune évaluation pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={`${r.term}-${r.period}`} className="rounded-2xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{r.period}</div>
                  <div className="text-xs text-muted-foreground">{r.term}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Global</div>
                    <StarsLine value={r.avg_all_stars} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Enseignants</div>
                    <StarsLine value={r.avg_teacher_stars} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Admin</div>
                    <StarsLine value={r.avg_admin_stars} />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Enseignants: {r.teacher_count ?? 0} • Admin: {r.admin_count ?? 0}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
