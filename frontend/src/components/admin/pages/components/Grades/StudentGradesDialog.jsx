import React, { useEffect, useMemo, useState } from "react";
import {axiosClient} from "../../../../../api/axios";
import { adminGradesApi } from "../../../../../services/api/admin/AdminGradesServices";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";

function fullName(u) {
  const f = u?.firstname ?? "";
  const l = u?.lastname ?? "";
  return `${f} ${l}`.trim() || `#${u?.id}`;
}

export default function StudentGradesDialog({ student, open, onOpenChange }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Form
  const [form, setForm] = useState({
    subject_id: "",
    teacher_id: "",
    score: "",
    max_score: 20,
    graded_at: "",
    comment: "",
    // hidden defaults (you can expose later)
    term: "S1",
    exam_type: "Exam",
  });

  const canSave = useMemo(() => {
    return !!student?.id && !!form.subject_id && !!form.teacher_id && form.score !== "" && form.graded_at;
  }, [student?.id, form.subject_id, form.teacher_id, form.score, form.graded_at]);

  const loadGrades = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const res = await adminGradesApi.list({ student_id: student.id });
      const items = res.data?.data?.data ?? []; // paginator
      setGrades(items);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      // subjects
      const sRes = await axiosClient.get("/admin/subjects");
      setSubjects(sRes.data?.data ?? sRes.data ?? []);

      // teachers
      const tRes = await axiosClient.get("/admin/users", { params: { role: "teacher" } });
      // depending on your controller, may be paginator:
      const tItems = tRes.data?.data?.data ?? tRes.data?.data ?? tRes.data ?? [];
      setTeachers(tItems);
    } finally {
      setLoadingMeta(false);
    }
  };

useEffect(() => {
  let mounted = true;

  (async () => {
    if (!open || !student?.id) return;

    try {
      setLoadingMeta(true);
      setLoading(true);

      const [subRes, teacherRes, gradesRes] = await Promise.all([
        axiosClient.get("/admin/subjects"),
        axiosClient.get("/admin/users", { params: { role: "teacher" } }),
        adminGradesApi.list({ student_id: student.id }),
      ]);

      if (!mounted) return;

      const subOpts = (subRes?.data?.data ?? subRes?.data ?? []).map((s) => ({
        id: String(s.id),
        label: s.name,
      }));

      const teacherItems =
        teacherRes?.data?.data?.data ??
        teacherRes?.data?.data ??
        teacherRes?.data ??
        [];

      const teacherOpts = teacherItems.map((t) => ({
        id: String(t.id),
        label: `${t.firstname ?? ""} ${t.lastname ?? ""}`.trim() || `#${t.id}`,
      }));

      setSubjects(subOpts);
      setTeachers(teacherOpts);

      // ✅ grades paginator
      const items = gradesRes?.data?.data ?? [];
      setGrades(items);

      // ✅ preselect defaults
      setForm((prev) => ({
        ...prev,
        subject_id: prev.subject_id || (subOpts[0]?.id ?? ""),
        teacher_id: prev.teacher_id || (teacherOpts[0]?.id ?? ""),
        max_score: prev.max_score || 20,
        term: prev.term || "S1",
        exam_type: prev.exam_type || "Exam",
      }));
    } finally {
      if (mounted) {
        setLoadingMeta(false);
        setLoading(false);
      }
    }
  })();

  return () => {
    mounted = false;
  };
}, [open, student?.id]);



  const onCreate = async () => {
    const payload = {
      student_id: Number(student.id),
      subject_id: Number(form.subject_id),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      term: form.term || "S1",
      exam_type: form.exam_type || "Exam",
      title: null,
      score: Number(form.score),
      max_score: Number(form.max_score),
      graded_at: form.graded_at || null,
      comment: form.comment || null,
    };

      try {
        await adminGradesApi.create(payload);
      } catch (e) {
        console.log("422 details:", e?.response?.data);
        throw e;
      }
    await loadGrades();

    // reset only score/comment/date (keep subject/teacher for faster entry)
    setForm((p) => ({ ...p, score: "", graded_at: "", comment: "" }));
  };

  const onDelete = async (id) => {
    await adminGradesApi.remove(id);
    await loadGrades();
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
            <div className="text-sm text-muted-foreground">Ajouter une Note</div>

            <div className="grid grid-cols-1 gap-2">
              <Select value={form.subject_id} onValueChange={(v) => setForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={form.teacher_id} onValueChange={(v) => setForm(p => ({ ...p, teacher_id: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              placeholder="Commentaire de l’enseignant (optionnel)"
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />

            <Button onClick={onCreate} disabled={!canSave}>
              Enregistrer
            </Button>

            <div className="text-xs text-muted-foreground">
              Requis: Matiére + Enseignant + Note + Date
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Notes existantes</div>

            {loading ? (
              <div className="text-sm">Chargement...</div>
            ) : grades.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune note pour le moment.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {grades.map((g) => (
                  <div key={g.id} className="border rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {g.subject?.name ?? `Subject #${g.subject_id}`} — {g.score}/{g.max_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.graded_at ? `${g.graded_at} • ` : ""}
                        {g.teacher ? `${g.teacher?.firstname ?? ""} ${g.teacher?.lastname ?? ""}`.trim() : ""}
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
