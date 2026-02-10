import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../../../../ui/card";
import { Skeleton } from "../../../../ui/skeleton";
import { Badge } from "../../../../ui/badge";
import { Button } from "../../../../ui/button";
import { User, Star } from "lucide-react";

import StarBar from "./StarBar";
import AdminDisciplineDialog from "./AdminDisciplineDialog";

/* ----------------------------- helpers ----------------------------- */
const nf = (n) => (Number.isFinite(+n) ? (+n).toLocaleString() : "0");
const fmtStars = (v) => (Number.isFinite(+v) ? (+v).toFixed(2) : "—");

function initialsFromName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const out = (a + b).toUpperCase();
  return out || "U";
}

function RankBadge({ idx }) {
  const n = idx + 1;
  const tone =
    n === 1
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : n === 2
      ? "bg-slate-100 text-slate-800 border-slate-200"
      : n === 3
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-muted/50 text-muted-foreground border-border";
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${tone}`}>
      #{n}
    </span>
  );
}

export default function AdminDisciplineStudentGrid({
  students = [],
  loading = false,
  term,
  period,
}) {
  const [openStudent, setOpenStudent] = useState(null);

  // stable “view models” (safe if backend changes)
  const cards = useMemo(() => {
    return (students || []).map((s) => {
      const name =
        s?.name ??
        [s?.firstname, s?.lastname].filter(Boolean).join(" ").trim() ??
        `#${s?.id ?? "?"}`;
      return {
        id: s?.id,
        raw: s,
        name,
        avg_all_stars: s?.avg_all_stars ?? s?.avg_stars ?? null,
        teacher_count: s?.teacher_count ?? 0,
        admin_count: s?.admin_count ?? 0,
      };
    });
  }, [students]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!cards.length) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Aucun élève trouvé.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c, idx) => (
          <Card
            key={c.id ?? idx}
            className="rounded-2xl hover:shadow-sm transition-shadow"
          >
            <CardContent className="p-5 space-y-4">
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <RankBadge idx={idx} />
                <div className="text-xs text-muted-foreground">
                  {term} • {period}
                </div>
              </div>

              {/* Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted/70 grid place-items-center shrink-0">
                  <span className="text-xs font-semibold">
                    {initialsFromName(c.name)}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {c.id ?? "—"}
                  </div>
                </div>
              </div>

              {/* Stars */}
              <div className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Moyenne globale
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {fmtStars(c.avg_all_stars)}/5
                  </Badge>
                </div>
                <StarBar value={c.avg_all_stars} />
                <div className="text-xs text-muted-foreground">
                  Enseignants: <span className="font-medium text-foreground">{nf(c.teacher_count)}</span>
                  {" • "}
                  Admin: <span className="font-medium text-foreground">{nf(c.admin_count)}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full rounded-xl"
                onClick={() => setOpenStudent(c.raw)}
              >
                <User className="h-4 w-4 mr-2" />
                Ouvrir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDisciplineDialog
        student={openStudent}
        open={!!openStudent}
        onOpenChange={(v) => !v && setOpenStudent(null)}
        term={term}
        period={period}
      />
    </>
  );
}
