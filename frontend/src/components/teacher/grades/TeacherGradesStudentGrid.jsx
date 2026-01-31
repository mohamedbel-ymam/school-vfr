import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import TeacherGradesDialog from "./TeacherGradesDialog";
import { useAuth } from "../../../context/AuthContext";

/* ---------- helpers ---------- */
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

// If your backend returns relative "/storage/..." we convert it to absolute URL.
// Change this if your API base differs.
const API_ORIGIN = "https://api.takwaetablissement.com";

function normalizeAvatarUrl(url) {
  if (!url) return null;
  if (typeof url !== "string") return null;

  // already absolute
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // relative
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;

  // fallback
  return `${API_ORIGIN}/${url}`;
}

function fullName(s) {
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  const n = `${f} ${l}`.trim();
  return n || (s?.name ?? "").trim() || `#${s?.id ?? "?"}`;
}

/**
 * Avatar not rounded (square)
 * - tries multiple fields
 * - handles relative /storage/... urls
 * - fallback initials
 */
function StudentAvatarSquare({ student }) {
  const [broken, setBroken] = useState(false);

  // Try the most common shapes you might return from backend
  const raw =
    student?.avatar_url ||
    student?.avatar ||
    student?.photo_url ||
    student?.avatar?.url || // if you ever wrap it
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

export default function TeacherGradesStudentGrid({ students = [], loading }) {
  const [openStudent, setOpenStudent] = useState(null);
  const { user } = useAuth();

  const rows = useMemo(() => students ?? [], [students]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
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
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold border">
                {idx + 1}
              </div>

              {/* avatar (square) */}
              <StudentAvatarSquare student={s} />

              {/* info */}
              <div className="min-w-0">
                <div className="font-semibold truncate">{fullName(s)}</div>
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
