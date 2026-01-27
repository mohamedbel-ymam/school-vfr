import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Star } from "lucide-react";
import TeacherDisciplineDialog from "./TeacherDisciplineDialog";

function StarMini({ v }) {
  const n = Math.round(Number(v || 0));
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= n ? "fill-current" : ""} />)}
      <span className="text-xs text-muted-foreground ml-1">{v == null ? "—" : Number(v).toFixed(2)}</span>
    </div>
  );
}

export default function TeacherDisciplineStudentGrid({ students = [], loading, term, period }) {
  const [openStudent, setOpenStudent] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!students.length) return <div className="text-sm text-muted-foreground">Aucun élève.</div>;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {students.map((s, idx) => (
          <Card
            key={s.id}
            className="rounded-2xl cursor-pointer hover:shadow-md transition"
            onClick={() => setOpenStudent(s)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">#{idx + 1}</div>
                <div className="text-xs text-muted-foreground">{term} • {period}</div>
              </div>

              <div className="font-semibold truncate">{s.name}</div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Votre évaluation</div>
                <StarMini v={s.my_stars} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeacherDisciplineDialog
        student={openStudent}
        open={!!openStudent}
        onOpenChange={(v) => !v && setOpenStudent(null)}
        term={term}
        period={period}
      />
    </>
  );
}
