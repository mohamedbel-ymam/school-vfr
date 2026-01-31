import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Star } from "lucide-react";
import TeacherDisciplineDialog from "./TeacherDisciplineDialog";

/* ----- same helpers as grades ----- */
const API_ORIGIN = "https://api.takwaetablissement.com";

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

function normalizeAvatarUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

function fullName(s) {
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  const n = `${f} ${l}`.trim();
  return n || (s?.name ?? "").trim() || `#${s?.id ?? "?"}`;
}

function StudentAvatarSquare({ student }) {
  const [broken, setBroken] = useState(false);

  const raw =
    student?.avatar_url ||
    student?.avatar ||
    student?.photo_url ||
    student?.avatar?.url ||
    null;

  const src = normalizeAvatarUrl(raw);
  const fallback = initialsFromStudent(student);

  if (!src || broken) {
    return (
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center font-semibold border">
        {fallback || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fullName(student)}
      className="h-10 w-10 rounded-xl object-cover border"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

function StarMini({ v }) {
  const n = Math.round(Number(v || 0));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= n ? "fill-current" : ""} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {v == null ? "—" : Number(v).toFixed(2)}
      </span>
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
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
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

              <div className="flex items-center gap-3">
                <StudentAvatarSquare student={s} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{fullName(s)}</div>
                  <div className="text-xs text-muted-foreground">Élève</div>
                </div>
              </div>

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
