import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Search, X } from "lucide-react";

import TeacherGradesDialog from "./TeacherGradesDialog";
import { useAuth } from "../../../context/AuthContext";

/* ------------------------------ helpers ------------------------------ */
function initialsFromStudent(s) {
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

  const name = (s?.name ?? "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

const API_ORIGIN = "https://api.takwaetablissement.com";

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
function pickAvatarUrl(u) {
  // ✅ prefer public url (what you said works)
  return (
    u?.avatar_public_url ||
    u?.avatar_url ||
    u?.avatar ||
    u?.photo_url ||
    null
  );
}
function StudentAvatarSquare({ student }) {
  const [broken, setBroken] = useState(false);

  // ✅ your working line
  let src = pickAvatarUrl(student);
  // optional: normalize if backend returns "/storage/..."
  if (src && typeof src === "string" && src.startsWith("/")) {
    src = `https://api.takwaetablissement.com${src}`;
  }

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


/* ------------------------------ component ------------------------------ */
export default function TeacherGradesStudentGrid({ students = [], loading }) {
  const [openStudent, setOpenStudent] = useState(null);
  const { user } = useAuth();

  // ✅ search by NAME (not email)
  const [q, setQ] = useState("");

  const rows = useMemo(() => students ?? [], [students]);

  const filtered = useMemo(() => {
    const query = String(q ?? "").toLowerCase().trim();
    if (!query) return rows;

    return rows.filter((s) => fullName(s).toLowerCase().includes(query));
  }, [rows, q]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

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
      </div>
    );
  }

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">Aucun élève.</div>;
  }

  return (
    <>
      {/* Search bar */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un élève par nom/prénom…"
                className="pl-9 rounded-xl"
              />
            </div>

            {!!q && (
              <Button variant="secondary" className="rounded-xl" onClick={() => setQ("")}>
                <X className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {filtered.length} / {rows.length} élève(s)
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucun résultat.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map((s, idx) => (
            <Card
              key={s.id}
              className="rounded-2xl cursor-pointer hover:shadow-sm transition"
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
      )}

      {/* Dialog */}
      <TeacherGradesDialog
        student={openStudent}
        open={!!openStudent}
        onOpenChange={(v) => !v && setOpenStudent(null)}
        user={user}
      />
    </>
  );
}
