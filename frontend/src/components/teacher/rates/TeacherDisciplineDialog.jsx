import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { Star } from "lucide-react";
import { teacherRatingsApi } from "../../../services/api/Teacher/TeacherRatingsServices";

/* ------------------------- helpers ------------------------- */
function fullName(u) {
  const f = u?.firstname ?? "";
  const l = u?.lastname ?? "";
  const n = `${f} ${l}`.trim();
  return n || u?.name || `#${u?.id}`;
}

function initialsFromStudent(s) {
  const f = (s?.firstname ?? "").trim();
  const l = (s?.lastname ?? "").trim();
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

  const name = (s?.name ?? "").trim();
  const parts = name.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase() || "?";
}

function AvatarLarge({ student, size = 92 }) {
  const [broken, setBroken] = useState(false);

  // approved avatar only
  let src = student?.avatar_url || student?.avatar || student?.photo_url || null;

  // If backend returns relative storage path, you can optionally normalize here:
  // if (src && !src.startsWith("http")) src = `${import.meta.env.VITE_API_URL}/storage/${src.replace(/^\/?storage\/?/, "")}`;

  const fallback = initialsFromStudent(student);

  if (!src || broken) {
    return (
      <div
        className="shrink-0 border bg-muted flex items-center justify-center font-semibold text-lg"
        style={{ width: size, height: size, borderRadius: 16 }} // ✅ not rounded
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fullName(student)}
      loading="lazy"
      onError={() => setBroken(true)}
      className="shrink-0 object-cover border"
      style={{ width: size, height: size, borderRadius: 16 }} // ✅ not rounded
    />
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 rounded-md hover:bg-muted transition"
          aria-label={`${n} étoiles`}
        >
          <Star className={n <= value ? "fill-current" : ""} size={18} />
        </button>
      ))}
      <span className="text-xs text-muted-foreground ml-2">{value}/5</span>
    </div>
  );
}

/* ------------------------- component ------------------------- */
export default function TeacherDisciplineDialog({ student, open, onOpenChange, term, period }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [stars, setStars] = useState(4);
  const [ratedAt, setRatedAt] = useState(""); // YYYY-MM-DD
  const [comment, setComment] = useState("");

  const canSave = useMemo(() => !!student?.id && stars >= 1 && stars <= 5, [student?.id, stars]);

  const load = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const res = await teacherRatingsApi.list({ student_id: student.id, term, period });
      // paginator or direct array
      setItems(res.data?.data?.data ?? res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !student?.id) return;
    setRatedAt("");
    setComment("");
    setStars(4);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id, term, period]);

  const onSave = async () => {
    await teacherRatingsApi.upsert({
      student_id: Number(student.id),
      term: term || "S1",
      stars,
      rated_at: ratedAt || null, // backend computes period (or now)
      comment: comment || null,
    });
    await load();
    setComment("");
  };

  const studentName = fullName(student);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="space-y-3">
            {/* ✅ New top header with big avatar */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AvatarLarge student={student} size={92} />
                <div className="min-w-0">
                  <div className="text-lg font-semibold leading-tight truncate">
                    Discipline ⭐ — <span className="font-bold">{studentName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Filtre actif : <b>{term}</b> • <b>{period}</b>
                  </div>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FORM */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Votre évaluation du mois</div>

            <StarPicker value={stars} onChange={setStars} />

            <Input
              className="rounded-xl"
              type="date"
              value={ratedAt}
              onChange={(e) => setRatedAt(e.target.value)}
            />

            <Textarea
              className="rounded-xl"
              placeholder="Commentaire (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <Button onClick={onSave} disabled={!canSave}>
              Enregistrer
            </Button>

            <div className="text-xs text-muted-foreground">
              Astuce : si vous laissez la date vide, le système utilise la date du jour.
            </div>
          </div>

          {/* HISTORY */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Historique (vos évaluations)</div>

            {loading ? (
              <div className="text-sm">Chargement...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune évaluation pour ce filtre.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {items.map((r) => (
                  <div key={r.id} className="border rounded-xl p-3">
                    <div className="font-semibold">{r.stars}/5</div>
                    <div className="text-xs text-muted-foreground">
                      {r.rated_at ? `${r.rated_at} • ` : ""}
                      {r.period ? `Période: ${r.period}` : ""}
                      {r.term ? ` • ${r.term}` : ""}
                    </div>
                    {r.comment ? <div className="text-sm mt-1">{r.comment}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
