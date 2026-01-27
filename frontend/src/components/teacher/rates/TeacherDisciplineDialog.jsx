import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { Star } from "lucide-react";
import { teacherRatingsApi } from "../../../services/api/Teacher/TeacherRatingsServices";

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-1">
          <Star className={n <= value ? "fill-current" : ""} size={18} />
        </button>
      ))}
      <span className="text-xs text-muted-foreground ml-2">{value}/5</span>
    </div>
  );
}

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
      setItems(res.data?.data ?? []); // paginator
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
  }, [open, student?.id]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            Discipline ⭐ — <span className="font-bold">{student?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              Filtre actif : {term} • {period}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Historique (vos évaluations)</div>

            {loading ? (
              <div className="text-sm">Chargement...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune évaluation pour ce mois.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {items.map((r) => (
                  <div key={r.id} className="border rounded-xl p-3">
                    <div className="font-semibold">
                      {r.stars}/5
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.rated_at ? `${r.rated_at} • ` : ""}
                      {r.period ? `Période: ${r.period}` : ""}
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
