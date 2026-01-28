import React, { useEffect, useMemo, useState } from "react";
import { axiosClient } from "../../../api/axios";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { toast } from "sonner";

const unwrap = (r) => r?.data?.data?.data ?? r?.data?.data ?? r?.data ?? [];

function fullName(u) {
  const f = u?.firstname ?? "";
  const l = u?.lastname ?? "";
  return `${f} ${l}`.trim() || `#${u?.id}`;
}

export default function TeacherGradeDialog({ open, onOpenChange }) {
  // teacher subject (from /me or injected by parent)
  const [me, setMe] = useState(null);

  // degrees + selected
  const [degrees, setDegrees] = useState([]);
  const [degreeId, setDegreeId] = useState("");

  // students in degree (ordered by avg)
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");

  // grades list for selected student (teacher scope)
  const [grades, setGrades] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // form
  const [form, setForm] = useState({
    score: "",
    max_score: 20,
    graded_at: "",
    comment: "",
    term: "S1",
    exam_type: "Exam",
    title: "",
  });

  const subjectLabel = useMemo(() => {
    const code = me?.subject?.code || me?.subject_code || "";
    const name = me?.subject?.name || me?.subject_name || "Matière";
    return code ? `${name} (${code})` : name;
  }, [me]);

  const canSave = useMemo(() => {
    return !!degreeId && !!studentId && form.score !== "" && !!form.graded_at;
  }, [degreeId, studentId, form.score, form.graded_at]);

  // -------------------- LOAD ME + DEGREES --------------------
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        // ✅ ME (so we can show subject)
        const meRes = await axiosClient.get("/me");
        const user = meRes?.data?.user ?? meRes?.data ?? null;

        // ✅ degrees for teacher (your route uses /enseignant/degrees)
        const degRes = await axiosClient.get("/enseignant/degrees");
        const degList = degRes?.data?.data ?? unwrap(degRes);

        if (!mounted) return;

        setMe(user);
        setDegrees(degList);

        const firstDeg = degList?.[0]?.id ? String(degList[0].id) : "";
        setDegreeId((prev) => prev || firstDeg);
      } catch (e) {
        console.error(e);
        toast.error("Impossible de charger vos informations.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  // -------------------- LOAD STUDENTS FOR DEGREE --------------------
  useEffect(() => {
    if (!open || !degreeId) return;
    let mounted = true;

    (async () => {
      setLoadingStudents(true);
      try {
        // ✅ teacher leaderboard endpoint (you said 404 currently)
        // We will use: /enseignant/degrees/{degree}/grades-leaderboard
        const res = await axiosClient.get(`/enseignant/degrees/${degreeId}/grades-leaderboard`, {
          params: { limit: 150, term: form.term },
        });

        const list = res?.data?.data ?? unwrap(res);

        if (!mounted) return;

        setStudents(list);

        const firstStudent = list?.[0]?.id ? String(list[0].id) : "";
        setStudentId((prev) => prev || firstStudent);
      } catch (e) {
        console.error(e);
        setStudents([]);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    })();

    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, degreeId, form.term]);

  // -------------------- LOAD GRADES FOR SELECTED STUDENT (teacher) --------------------
  const loadGrades = async () => {
    if (!studentId) return;
    try {
      // ✅ teacher grades index should filter to teacher entered_by on backend
      const res = await axiosClient.get("/enseignant/grades", {
        params: { student_id: Number(studentId), term: form.term, per_page: 200 },
      });
      const rows = res?.data?.data?.data ?? res?.data?.data ?? [];
      setGrades(rows);
    } catch (e) {
      console.error(e);
      setGrades([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId, form.term]);

  // -------------------- CREATE GRADE (NO subject_id/teacher_id) --------------------
  const onCreate = async () => {
    const payload = {
      student_id: Number(studentId),
      term: form.term || "S1",
      exam_type: form.exam_type || "Exam",
      title: form.title || null,
      score: Number(form.score),
      max_score: Number(form.max_score || 20),
      graded_at: form.graded_at || null,
      comment: form.comment || null,
      // ✅ subject_id & teacher_id are forced in backend for teacher
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
      <DialogContent className="max-w-5xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span>Saisie des notes</span>
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              {subjectLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Filters */}
          <div className="space-y-3 lg:col-span-1">
            <div className="text-sm text-muted-foreground">Sélection</div>

            <Select value={degreeId} onValueChange={setDegreeId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Degré" />
              </SelectTrigger>
              <SelectContent>
                {degrees.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name ?? `Degré #${d.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.term} onValueChange={(v) => setForm((p) => ({ ...p, term: v }))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Trimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S1">S1</SelectItem>
                <SelectItem value="S2">S2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={studentId} onValueChange={setStudentId} disabled={loadingStudents}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={loadingStudents ? "Chargement..." : "Élève"} />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name ?? fullName(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground">
              Les élèves sont triés par moyenne (meilleurs en haut).
            </div>
          </div>

          {/* MIDDLE: Form */}
          <div className="space-y-3 lg:col-span-1">
            <div className="text-sm text-muted-foreground">Ajouter une note</div>

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
              Matière automatiquement affectée à <b>votre matière</b>.
            </div>
          </div>

          {/* RIGHT: Existing grades */}
          <div className="space-y-3 lg:col-span-1">
            <div className="text-sm text-muted-foreground">Notes enregistrées</div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Chargement…</div>
            ) : grades.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune note pour le moment.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                {grades.map((g) => (
                  <div key={g.id} className="border rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {g.exam_type ?? "Examen"} — {g.score}/{g.max_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.graded_at ? `${g.graded_at}` : ""}
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
