// components/teacher/attendances/TeacherAttendanceRun.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../api/axios";

const STATUS = {
  presence: "presence",
  absence: "absence",
  not_marked: "not_marked",
};

/* ------------------------- helpers ------------------------- */
function initialsFromName(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  const f = parts[0]?.[0] ?? "";
  const l = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (f + l).toUpperCase() || "?";
}

function ReelsStudentCard({
  student,
  degreeName,
  onPresent,
  onAbsent,
  saving,
  savingStatus, // "presence" | "absence" | null
}) {
  const hasPhoto = !!student?.avatar_public_url;
  const initials = initialsFromName(student?.full_name || "");

  const isSavingPresent = saving && savingStatus === "presence";
  const isSavingAbsent = saving && savingStatus === "absence";

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-3xl border">
        <div className="relative w-full h-[62vh] min-h-[420px] bg-black">
          {hasPhoto ? (
            <img
              src={student.avatar_public_url}
              alt={student.full_name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900">
              <div className="text-white text-7xl font-black tracking-widest opacity-95 select-none">
                {initials}
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-4">
              <div className="text-white text-2xl font-extrabold leading-tight">
                {student.full_name}
              </div>
              <div className="mt-1 text-white/75 text-sm">
                {degreeName || "Classe"}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* PRESENT = GREEN */}
                <button
                  disabled={saving}
                  onClick={onPresent}
                  className={[
                    "rounded-2xl py-4 text-lg font-semibold active:scale-[0.99] disabled:opacity-70",
                    "bg-emerald-500 text-white shadow",
                    isSavingPresent ? "opacity-90" : "",
                  ].join(" ")}
                >
                  {isSavingPresent ? "En cours…" : "Présent"}
                </button>

                {/* ABSENT = RED */}
                <button
                  disabled={saving}
                  onClick={onAbsent}
                  className={[
                    "rounded-2xl py-4 text-lg font-semibold active:scale-[0.99] disabled:opacity-70",
                    "bg-red-500 text-white shadow",
                    isSavingAbsent ? "opacity-90" : "",
                  ].join(" ")}
                >
                  {isSavingAbsent ? "En cours…" : "Absent"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm opacity-70 text-center">
        Statut: <span className="font-semibold">{student.status}</span>
      </div>
    </div>
  );
}


/* ------------------------- page ------------------------- */
export default function TeacherAttendanceRun() {
  const { degreeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [savingStatus, setSavingStatus] = useState(null); // "presence" | "absence" | null


  const cardRef = useRef(null);

  const total = students.length;
  const doneCount = useMemo(
    () => students.filter((s) => s.status === STATUS.presence || s.status === STATUS.absence).length,
    [students]
  );

  const degreeName =
    session?.degree_name ||
    session?.degree?.name ||
    session?.degreeName ||
    "";

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await axiosClient.get("/enseignant/attendance/roster", {
          params: { degree_id: degreeId },
        });

        if (!mounted) return;

        setSession(res.data.session || null);
        setStudents(res.data.students || []);
        setIndex(0);
      } catch (e) {
        if (!mounted) return;

        const status = e?.response?.status;

        if (status === 401) {
          setErrorMsg("Session expirée. Veuillez vous reconnecter.");
        } else if (status === 404) {
          setErrorMsg(
            "API introuvable (404). Vérifiez les routes Laravel: /api/enseignant/attendance/roster."
          );
        } else {
          setErrorMsg(e?.response?.data?.message ?? "Erreur lors du chargement.");
        }

        setSession(null);
        setStudents([]);
        setIndex(0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [degreeId]);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index]);

  const current = students[index];

 async function mark(status) {
  if (!current || !session) return;
  if (saving) return;

  setSaving(true);
  setSavingStatus(status);

  setStudents((prev) =>
    prev.map((s, i) => (i === index ? { ...s, status } : s))
  );

  try {
    await axiosClient.put("/enseignant/attendance/mark", {
      session_id: session.id,
      student_id: current.id,
      status,
    });

    setIndex((i) => Math.min(i + 1, total));
  } catch (e) {
    setStudents((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status: STATUS.not_marked } : s))
    );
    alert(e?.response?.data?.message ?? "Erreur lors de l’enregistrement. Réessaie.");
  } finally {
    setSaving(false);
    setSavingStatus(null);
  }
}

  /* ------------------------- UI states ------------------------- */
  if (loading) {
    return <div className="p-4">Chargement…</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-xl font-semibold">Impossible de charger l’appel</div>
        <div className="opacity-70">{errorMsg}</div>
        <button
          onClick={() => navigate("/enseignant/attendance")}
          className="rounded-2xl border px-4 py-3 font-semibold"
        >
          Retour aux classes
        </button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-xl font-semibold">Aucun élève trouvé.</div>
        <div className="opacity-70">
          Vérifiez la classe (degree) ou l’affectation des élèves.
        </div>
        <button
          onClick={() => navigate("/enseignant/attendance")}
          className="rounded-2xl border px-4 py-3 font-semibold"
        >
          Retour aux classes
        </button>
      </div>
    );
  }

  if (index >= total) {
    return (
      <div className="p-6 flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-2xl font-semibold">Merci beaucoup, professeur !</div>
          <div className="opacity-70">
            Présences traitées : {doneCount} / {total}
          </div>
          <button
            onClick={() => navigate("/enseignant/attendance")}
            className="rounded-2xl border px-4 py-3 font-semibold"
          >
            Retour aux classes
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------- main ------------------------- */
  return (
    <div className="p-3">
      {/* Progress */}
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

      {/* Reels Card */}
      <div ref={cardRef}>
        <ReelsStudentCard
          student={current}
          degreeName={degreeName}
          saving={saving}
          savingStatus={savingStatus}
          onPresent={() => mark(STATUS.presence)}
          onAbsent={() => mark(STATUS.absence)}
        />
      </div>

      {/* optional next preview */}
      {students[index + 1] ? (
        <div className="mt-3 text-sm opacity-70 text-center">
          Prochain: {students[index + 1].full_name}
        </div>
      ) : null}
    </div>
  );
}
