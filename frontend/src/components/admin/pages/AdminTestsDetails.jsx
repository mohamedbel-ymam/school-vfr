import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
export default function AdminTestDetails() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [testRes, attRes] = await Promise.all([
          axiosClient.get(`/admin/tests/${testId}`),
          axiosClient.get(`/admin/tests/${testId}/attempts`),
        ]);

        setTest(testRes.data.test);
        setAttempts(attRes.data);
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger les informations du test.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [testId]);

  const stats = useMemo(() => {
    const valid = attempts.filter((a) => a.is_valid);
    if (!valid.length) return null;

    const scores = valid.map((a) => a.score ?? 0);
    const times = valid.map((a) => a.time_spent_seconds).filter((t) => Number.isFinite(t));

    return {
      avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      validAttempts: valid.length,
      totalAttempts: attempts.length,
    };
  }, [attempts]);

  const invalidateAttempt = async (attemptId) => {
    try {
      await axiosClient.delete(`/admin/tests/attempts/${attemptId}`);
      toast.success("Tentative invalidée.");
      setAttempts((prev) =>
        prev.map((a) =>
          a.attempt_id === attemptId ? { ...a, is_valid: false } : a
        )
      );
    } catch {
      toast.error("Erreur lors de l’invalidation.");
    }
  };

  if (loading) return <div className="p-4">Chargement…</div>;
  if (!test) return <div className="p-4">Test introuvable.</div>;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enseignant :{" "}
            <span className="font-medium">
              {test.teacher
                ? `${test.teacher.firstname} ${test.teacher.lastname}`
                : "—"}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Note /{test.grade_value} — Durée {test.global_time_minutes} min —{" "}
            {test.total_questions} questions
          </p>
        </CardHeader>
      </Card>

      {/* STATS */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques globales</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div>Score moyen : {stats.avgScore}</div>
            <div>
              Meilleur / Pire : {stats.maxScore} / {stats.minScore}
            </div>
            <div>Temps moyen : {formatDuration(stats.avgTime)}</div>
            <div>
              Tentatives valides : {stats.validAttempts} /{" "}
              {stats.totalAttempts}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ATTEMPTS */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tentatives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!attempts.length && (
            <div className="text-muted-foreground">
              Aucune tentative enregistrée.
            </div>
          )}

          {attempts.map((a) => (
            <div
              key={a.attempt_id}
              className="border rounded p-3 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {a.student_fullname || "—"}
                  <span className="text-xs text-muted-foreground">
                    (Tentative {a.attempt_number})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Score : {a.score} / {test.grade_value} — Temps :{" "}
                  <div className="text-xs">
                    Temps écoulé: {formatDuration(a.time_spent_seconds)}{" "}
                    ({a.time_spent_seconds ?? 0}s)
                </div>
                </div>
                <div className="text-xs">
                  Statut :{" "}
                  <span
                    className={
                      a.is_valid ? "text-green-600" : "text-red-600"
                    }
                  >
                    {a.is_valid ? "Valide" : "Invalidée"}
                  </span>
                </div>
              </div>

              {a.is_valid && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => invalidateAttempt(a.attempt_id)}
                >
                  Invalider
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => navigate("/admin/tests")}>
        Retour à la liste
      </Button>
    </div>
  );
}
