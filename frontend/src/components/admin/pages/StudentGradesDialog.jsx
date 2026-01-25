import React, { useEffect, useState } from "react";
import { adminGradesApi } from "../../../services/api/admin/AdminGradesServices";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export default function StudentGradesDialog({ student, open, onOpenChange }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // simple form state (you can swap to react-hook-form + zod later)
  const [form, setForm] = useState({
    subject_id: "",
    teacher_id: "",
    term: "S1",
    exam_type: "Exam",
    title: "",
    score: "",
    max_score: 20,
    graded_at: "",
    comment: "",
  });

 const load = async () => {
  if (!student?.id) return;
  setLoading(true);
  try {
    const res = await adminGradesApi.list({ student_id: student.id });

    // Laravel paginator => { data: { data: [...] , links..., meta... } }
    const items = res.data?.data?.data ?? [];

    setGrades(items);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id]);

  const onCreate = async () => {
    const payload = {
      student_id: student.id,
      subject_id: Number(form.subject_id),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      term: form.term,
      exam_type: form.exam_type,
      title: form.title || null,
      score: Number(form.score),
      max_score: Number(form.max_score),
      graded_at: form.graded_at || null,
      comment: form.comment || null,
    };
    await adminGradesApi.create(payload);
    await load();
  };

  const onDelete = async (id) => {
    await adminGradesApi.remove(id);
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            Manage grades — <span className="font-bold">{student?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Add grade</div>

            <Input
              placeholder="Subject ID (temporary) e.g. 3"
              value={form.subject_id}
              onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
            />
            <Input
              placeholder="Teacher ID (optional)"
              value={form.teacher_id}
              onChange={(e) => setForm((p) => ({ ...p, teacher_id: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Term (S1/S2)"
                value={form.term}
                onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
              />
              <Input
                placeholder="Exam type"
                value={form.exam_type}
                onChange={(e) => setForm((p) => ({ ...p, exam_type: e.target.value }))}
              />
            </div>

            <Input
              placeholder="Title (optional)"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Score"
                value={form.score}
                onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
              />
              <Input
                placeholder="Max score"
                value={form.max_score}
                onChange={(e) => setForm((p) => ({ ...p, max_score: e.target.value }))}
              />
            </div>

            <Input
              placeholder="Graded at (YYYY-MM-DD)"
              value={form.graded_at}
              onChange={(e) => setForm((p) => ({ ...p, graded_at: e.target.value }))}
            />

            <Input
              placeholder="Comment (optional)"
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />

            <Button onClick={onCreate} disabled={!form.subject_id || form.score === ""}>
              Save grade
            </Button>

            <div className="text-xs text-muted-foreground">
              (We’ll replace Subject ID / Teacher ID by real selects next.)
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Existing grades</div>

            {loading ? (
              <div className="text-sm">Loading...</div>
            ) : grades.length === 0 ? (
              <div className="text-sm text-muted-foreground">No grades yet.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {grades.map((g) => (
                  <div
                    key={g.id}
                    className="border rounded-xl p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {g.subject?.name ?? `Subject #${g.subject_id}`} — {g.score}/{g.max_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.term} • {g.exam_type} {g.title ? `• ${g.title}` : ""} {g.graded_at ? `• ${g.graded_at}` : ""}
                      </div>
                      {g.comment ? <div className="text-sm mt-1">{g.comment}</div> : null}
                    </div>

                    <Button variant="destructive" onClick={() => onDelete(g.id)}>
                      Delete
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
