import React, { useState } from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import StarBar from "./StarBar";
import AdminDisciplineDialog from "./AdminDisciplineDialog";

export default function AdminDisciplineStudentGrid({ students = [], loading, term, period }) {
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

  if (!students.length) {
    return <div className="text-sm text-muted-foreground">Aucun élève trouvé.</div>;
  }

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
                <div className="text-xs text-muted-foreground">Moyenne globale</div>
                <StarBar value={s.avg_all_stars} />
              </div>

              <div className="text-xs text-muted-foreground">
                Enseignants: {s.teacher_count ?? 0} • Admin: {s.admin_count ?? 0}
              </div>
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
