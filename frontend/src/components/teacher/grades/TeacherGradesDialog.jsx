import React, { useEffect, useMemo, useState } from "react";
import {axiosClient} from "../../../api/axios";
import { teacherGradesApi } from "../../../services/api/Teacher/TeacherGradesServices";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

export default function TeacherGradesDialog({ student, open, onOpenChange }) {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    subject_id: "",
    score: "",
    max_score: 20,
    graded_at: "",
    comment: "",
    term: "S1",
    exam_type: "Exam",
  });

  const canSave = useMemo(() => {
    return !!student?.id && !!form.subject_id && form.score !== "" && form.graded_at;
  }, [student?.id, form.subject_id, form.score, form.graded_at]);

  const load = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const [subRes, gradeRes] = await Promise.all([
        axiosClient.get("/admin/subjects"), // teacher needs subject list; if you have /teacher/subjects replace it
        teacherGradesApi.list({ student_id: student.id }),
      ]);

      setSubjects((subRes.data?.data ?? subRes.data ?? []).map(s => ({ id: String(s.id), label: s.name })));
      setGrades(gradeRes.data?.data ?? []); // paginator
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !student?.id) return;
    setEditing(null);
    setForm((p) => ({ ...p, score: "", graded_at: "", comment: "" }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id]);

  const onSubmit = async () => {
    const payload = {
      student_id: Number(student.id),
      subject_id: Number(form.subject_id),
      teacher_id: null, // backend should set teacher_id = auth teacher
      term: form.term || "S1",
      exam_type: form.exam_type || "Exam",
      title: null,
      score: Number(form.score),
      max_score: Number(form.max_score),
      graded_at: form.graded_at,
      comment: form.comment || null,
    };

    if (editing?.id) {
      await teacherGradesApi.update(editing.id, payload);
    } else {
      await teacherGradesApi.create(payload);
    }

    await load();
    setEditing(null);
    setForm((p) => ({ ...p, score: "", graded_at: "", comment: "" }));
  };

  const startEdit = (g) => {
    setEditing(g);
    setForm((p) => ({
      ...p,
      subject_id: String(g.subject_id),
      score: String(g.score),
      max_score: String(g.max_score),
      graded_at: g.graded_at ?? "",
      comment: g.comment ?? "",
      term: g.term ?? "S1",
      exam_type: g.exam_type ?? "Exam",
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            Notes — <span className="font-bold">{student?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {editing ? "Modifier la note" : "Ajouter une note"}
            </div>

            <Select value={form.subject_id} onValueChange={(v) => setForm(p => ({ ...p, subject_id: v }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                placeholder="Barème"
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

            <Textarea
              className="rounded-xl"
              placeholder="Commentaire (optionnel)"
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />

            <div className="flex gap-2">
              <Button onClick={onSubmit} disabled={!canSave}>
                {editing ? "Mettre à jour" : "Enregistrer"}
              </Button>
              {editing ? (
                <Button variant="outline" onClick={() => { setEditing(null); setForm(p => ({ ...p, score:"", graded_at:"", comment:"" })); }}>
                  Annuler
                </Button>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground">
              Requis : Matière + Note + Date
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Notes saisies par vous</div>

            {loading ? (
              <div className="text-sm">Chargement...</div>
            ) : grades.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune note pour le moment.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {grades.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => startEdit(g)}
                    className="w-full text-left border rounded-xl p-3 hover:bg-muted transition"
                    type="button"
                  >
                    <div className="font-semibold truncate">
                      {g.subject?.name ?? `Matière #${g.subject_id}`} — {g.score}/{g.max_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.graded_at ? `${g.graded_at}` : ""}
                    </div>
                    {g.comment ? <div className="text-sm mt-1">{g.comment}</div> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
