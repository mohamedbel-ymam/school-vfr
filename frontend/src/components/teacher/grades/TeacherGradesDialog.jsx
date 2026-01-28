import React, { useEffect, useMemo, useState } from "react";
import { axiosClient } from "../../../api/axios";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { toast } from "sonner";

function labelFromSubject(code, fallback = "Matière") {
  const c = (code || "").toUpperCase().replace(/[^A-Z]/g, "");
  switch (c) {
    case "MATH": return "Mathématiques";
    case "PC": return "Physique & Chimie";
    case "SVT": return "SVT";
    case "FR": return "Français";
    case "ANG": return "Anglais";
    case "ARAB": return "Arabe";
    case "INFO": return "Informatique";
    case "HISGEO": return "Histoire-Géographie";
    case "EDUCISL": return "Éducation islamique";
    default: return fallback;
  }
}

function fullName(u) {
  const f = u?.firstname ?? "";
  const l = u?.lastname ?? "";
  return `${f} ${l}`.trim() || `#${u?.id}`;
}

export default function TeacherGradeDialog({ open, onOpenChange, student, user }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ subject from the SAME fields you used in TeacherDashboard
  const subjectCode = user?.subject?.code || user?.subject_code || null;
  const subjectName = user?.subject?.name || user?.subject_name || "Matière";
  const subjectLabel = useMemo(
    () => labelFromSubject(subjectCode, subjectName),
    [subjectCode, subjectName]
  );

  // ✅ IMPORTANT: teacher subject_id (whatever your user schema uses)
  // choose one that exists in your DB
  const teacherSubjectId =
    user?.subject_id ??
    user?.subject?.id ??
    user?.subjectId ??
    null;

  const [form, setForm] = useState({
    score: "",
    max_score: 20,
    graded_at: "",
    comment: "",
    term: "S1",
    exam_type: "Exam",
    title: "",
  });

  const canSave = useMemo(() => {
    return !!student?.id && form.score !== "" && !!form.graded_at && !!teacherSubjectId;
  }, [student?.id, form.score, form.graded_at, teacherSubjectId]);

  const loadGrades = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      // teacher scope endpoint (must exist)
      const res = await axiosClient.get("/enseignant/grades", {
        params: { student_id: student.id, term: form.term, per_page: 200 },
      });
      const rows = res?.data?.data?.data ?? res?.data?.data ?? [];
      setGrades(rows);
    } catch (e) {
      console.error(e);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id, form.term]);

  const onCreate = async () => {
    // ✅ subject_id is automatically teacher subject
    const payload = {
      student_id: Number(student.id),
      subject_id: Number(teacherSubjectId), // ✅ NO select, forced
      teacher_id: Number(user.id),          // ✅ to show teacher name in admin
      term: form.term || "S1",
      exam_type: form.exam_type || "Exam",
      title: form.title || null,
      score: Number(form.score),
      max_score: Number(form.max_score || 20),
      graded_at: form.graded_at || null,
      comment: form.comment || null,
    };

    try {
      await axiosClient.post("/enseignant/grades", payload);
      toast.success("Note enregistrée.");
      await loadGrades();
      setForm((p) => ({ ...p, score: "", graded_at: "", comment: "", title: "" }));
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message ?? "Erreur lors de l’enregistrement.");
    }
  };

  const onDelete = async (id) => {
    try {
      await axiosClient.delete(`/enseignant/grades/${id}`);
      toast.success("Note supprimée.");
      await loadGrades();
    } catch (e) {
      console.error(e);
      toast.error("Suppression impossible.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span>
              Notes — <span className="font-bold">{fullName(student)}</span>
            </span>

            {/* ✅ subject badge (fixed) */}
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              {subjectLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FORM */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Ajouter une note</div>

            {!teacherSubjectId ? (
              <div className="text-sm text-red-600">
                ⚠️ Votre compte enseignant n’a pas de <b>subject_id</b> configuré.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Input
                className="rounded-xl"
                placeholder="Note"
                type="number"
                value={form.score}
                onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
              />
              <Input
                className="rounded-xl"
                placeholder="Sur"
                type="number"
                value={form.max_score}
                onChange={(e) => setForm((p) => ({ ...p, max_score: e.target.value }))}
              />
            </div>

            <Input
              className="rounded-xl"
              type="date"
              value={form.graded_at}
              onChange={(e) => setForm((p) => ({ ...p, graded_at: e.target.value }))}
            />

            <Input
              className="rounded-xl"
              placeholder="Titre (optionnel)"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />

            <Textarea
              className="rounded-xl"
              placeholder="Commentaire (optionnel)"
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />

            <Button onClick={onCreate} disabled={!canSave}>
              Enregistrer
            </Button>

            <div className="text-xs text-muted-foreground">
              Matière affectée automatiquement : <b>{subjectLabel}</b>
            </div>
          </div>

          {/* LIST */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Notes enregistrées</div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Chargement…</div>
            ) : grades.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune note.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {grades.map((g) => (
                  <div key={g.id} className="border rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {g.exam_type ?? "Examen"} — {g.score}/{g.max_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.graded_at ?? ""}
                        {g.title ? ` • ${g.title}` : ""}
                      </div>
                      {g.comment ? <div className="text-sm mt-1">{g.comment}</div> : null}
                    </div>

                    <Button variant="destructive" onClick={() => onDelete(g.id)}>
                      Supprimer
                    </Button>
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
