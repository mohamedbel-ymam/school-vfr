// pages/TeacherAttendanceRun.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../api/axios"; // your configured axios instance

const STATUS = {
  presence: "presence",
  absence: "absence",
  not_marked: "not_marked",
};

export default function TeacherAttendanceRun() {
  const { degreeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const cardRef = useRef(null);

  const total = students.length;
  const doneCount = useMemo(
    () => students.filter((s) => s.status === STATUS.presence || s.status === STATUS.absence).length,
    [students]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get("/enseignant/attendance/roster", {
          params: { degree_id: degreeId },
        });
        setSession(res.data.session);
        setStudents(res.data.students || []);
        setIndex(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [degreeId]);

  useEffect(() => {
    // smooth "auto scroll" effect when index changes
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index]);

  const current = students[index];

  async function mark(status) {
    if (!current || !session) return;
    if (saving) return;

    setSaving(true);
    try {
      // optimistic update
      setStudents((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status } : s))
      );

      await axiosClient.put("/enseignant/attendance/mark", {
        session_id: session.id,
        student_id: current.id,
        status,
      });

      // move next
      setIndex((i) => Math.min(i + 1, total)); // total => end screen
    } catch (e) {
      // rollback if failed
      setStudents((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status: STATUS.not_marked } : s))
      );
      alert("Erreur lors de l’enregistrement. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4">Chargement…</div>;
  }

  // Finished screen
  if (index >= total) {
    return (
      <div className="p-6 flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold">Merci beaucoup, professeur !</div>
          <div className="mt-2 opacity-70">
            Présences traitées : {doneCount} / {total}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm opacity-70">
          {index + 1} / {total}
        </div>
        <div className="text-sm opacity-70">
          Faits: {doneCount} / {total}
        </div>
      </div>

      <div className="h-2 rounded-full bg-black/10 mb-4 overflow-hidden">
        <div
          className="h-full bg-black/40"
          style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }}
        />
      </div>

      <div ref={cardRef} className="rounded-2xl border p-4">
        <div className="flex items-center gap-4">
          <img
            src={current.avatar_public_url || "/images/avatar-placeholder.png"}
            alt={current.full_name}
            className="h-24 w-24 rounded-2xl object-cover border"
          />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide opacity-60">
              Élève
            </div>
            <div className="text-xl font-semibold truncate">
              {current.full_name}
            </div>
            <div className="text-sm opacity-70 mt-1">
              Statut: {current.status}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            disabled={saving}
            onClick={() => mark(STATUS.presence)}
            className="rounded-2xl py-4 text-lg font-semibold border active:scale-[0.99] disabled:opacity-50"
          >
            Présent
          </button>

          <button
            disabled={saving}
            onClick={() => mark(STATUS.absence)}
            className="rounded-2xl py-4 text-lg font-semibold border active:scale-[0.99] disabled:opacity-50"
          >
            Absent
          </button>
        </div>
      </div>

      {/* Optional: show next student preview */}
      {students[index + 1] && (
        <div className="mt-3 text-sm opacity-70">
          Prochain: {students[index + 1].full_name}
        </div>
      )}
    </div>
  );
}
