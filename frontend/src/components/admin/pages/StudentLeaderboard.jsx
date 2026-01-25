import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import StudentGradesDialog from "./StudentGradesDialog";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export default function StudentLeaderboard({ students = [], loading }) {
  const [openStudent, setOpenStudent] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!students.length) {
    return <div className="text-sm text-muted-foreground">No students found.</div>;
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
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage src={s.avatar_url ?? ""} />
                <AvatarFallback>{initials(s.name)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-sm text-muted-foreground">
                  Avg: {s.avg_percent == null ? "—" : `${Number(s.avg_percent).toFixed(1)}%`}
                  {"  "}•{"  "}
                  Notes: {s.grades_count ?? 0}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StudentGradesDialog
        student={openStudent}
        open={!!openStudent}
        onOpenChange={(v) => !v && setOpenStudent(null)}
      />
    </>
  );
}
