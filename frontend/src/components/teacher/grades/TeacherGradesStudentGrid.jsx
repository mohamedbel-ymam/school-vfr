import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import TeacherGradesDialog from "./TeacherGradesDialog";
import { useAuth } from "../../../context/AuthContext";

function initialsFromStudent(s) {
  // Prefer firstname/lastname if present
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

  // Fallback to "name"
  const name = (s?.name ?? "").trim();
  const parts = name.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function Avatar({ student }) {
  const [broken, setBroken] = useState(false);

  // approved avatar only
  const src = student?.avatar_url || student?.avatar || student?.photo_url || null;
  const fallback = initialsFromStudent(student);

  if (!src || broken) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">
        {fallback || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={student?.name ?? "Élève"}
      className="h-10 w-10 rounded-full object-cover border"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

export default function TeacherGradesStudentGrid({ students = [], loading }) {
  const [openStudent, setOpenStudent] = useState(null);
  const { user } = useAuth();

  // If you want: order by avg_percent desc (already maybe from backend)
  const rows = useMemo(() => students ?? [], [students]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">Aucun élève.</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {rows.map((s, idx) => (
          <Card
            key={s.id}
            className="rounded-2xl cursor-pointer hover:shadow-md transition"
            onClick={() => setOpenStudent(s)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              {/* rank */}
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </div>

              {/* avatar */}
              <Avatar student={s} />

              {/* info */}
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {s.name ?? `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim() ?? `#${s.id}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  Moyenne :{" "}
                  {s.avg_percent == null ? "—" : `${Number(s.avg_percent).toFixed(1)}%`}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeacherGradesDialog
        student={openStudent}
        open={!!openStudent}
        onOpenChange={(v) => !v && setOpenStudent(null)}
        user={user}
      />
    </>
  );
}
