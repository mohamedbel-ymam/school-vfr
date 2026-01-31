import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Star } from "lucide-react";
import TeacherDisciplineDialog from "./TeacherDisciplineDialog";

function initialsFromStudent(s) {
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

  const name = (s?.name ?? "").trim();
  const parts = name.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function Avatar({ student }) {
  const [broken, setBroken] = useState(false);

  const src =
    student?.avatar_url ||
    student?.avatar ||
    student?.photo_url ||
    null;

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

function StarMini({ v }) {
  const n = Math.round(Number(v || 0));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= n ? "fill-current" : ""}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {v == null ? "—" : Number(v).toFixed(2)}
      </span>
    </div>
  );
}

export default function TeacherDisciplineStudentGrid({
  students = [],
  loading,
  term,
  period,
}) {
  const [openStudent, setOpenStudent] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!students.length) {
    return <div className="text-sm text-muted-foreground">Aucun élève.</div>;
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
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">#{idx + 1}</div>
                <div className="text-xs text-muted-foreground">
                  {term} • {period}
                </div>
              </div>

              {/* ✅ avatar + name */}
              <div className="flex items-center gap-3">
                <Avatar student={s} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {s.name ??
                      `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim() ??
                      `#${s.id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Discipline / comportement
                  </div>
                </div>
              </div>

              {/* rating */}
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">
                  Votre évaluation
                </div>
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
