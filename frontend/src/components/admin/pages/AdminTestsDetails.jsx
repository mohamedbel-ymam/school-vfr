import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

function formatSeconds(s) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m} min ${sec.toString().padStart(2, "0")} s`;
}

export default function AdminTestDetails() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Charger test + tentatives */
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

  /* Stats calculées côté front */
  const stats = useMemo(() => {
    if (!attempts.length) return null;

    const valid = attempts.filter((a) => a.is_valid);
    if (!valid.length) return null;

    const scores = valid.map((a) => a.score ?? 0);
    const times = valid
      .map((a) => a.time_spent_seconds)
      .filter((t) => t !== null && t !== undefined);

    const sum = scores.reduce((acc, s) => acc + s, 0);
    const avg = sum / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    const sumTime = times.reduce((acc, t) => acc + t, 0);
    const avgTime = times.length ? sumTime / times.length : null;

    const successCount = valid.filter(
      (a) => a.score >= (test?.grade_value ?? 20) * 0.5
    ).length;
    const successRate = (successCount / valid.length) * 100;

    return {
      avgScore: avg.toFixed(2),
      minScore: min,
      maxScore: max,
      avgTime: avgTime ? Math.round(avgTime) : null,
      successRate: successRate.toFixed(1),
      totalAttempts: attempts.length,
      validAttempts: valid.length,
    };
  }, [attempts, test]);

  const invalidateAttempt = async (attemptId) => {
    try {
      await axiosClient.delete(`/admin/tests/attempts/${attemptId}`);
      toast.success("Tentative invalidée.");
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId ? { ...a, is_valid: false } : a
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’invalidation de la tentative.");
    }
  };

  const deleteTest = async () => {
    if (!window.confirm("Supprimer définitivement ce test et toutes les tentatives ?")) {
      return;
    }
    try {
      await axiosClient.delete(`/admin/tests/${testId}`);
      toast.success("Test supprimé.");
      navigate("/admin/tests");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du test.");
    }
  };

  if (loading) return <div className="p-4">Chargement…</div>;
  if (!test) return <div className="p-4">Test introuvable.</div>;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <Card>
        <CardHeader className="flex justify-between items-start gap-3">
          <div>
            <CardTitle className="text-lg">{test.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enseignant : <span className="font-medium">{test.teacher?.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Note sur {test.grade_value} – Durée {test.global_time_minutes} min –{" "}
              {test.total_questions} questions
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/tests")}>
              Retour à la liste
            </Button>
            <Button variant="destructive" onClick={deleteTest}>
              Supprimer le test
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques globales */}
      {stats ? (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques globales</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-semibold">Score moyen</div>
              <div>{stats.avgScore} / {test.grade_value}</div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold">Meilleur / Pire score</div>
              <div>
                Max : {stats.maxScore} — Min : {stats.minScore}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold">Taux de réussite</div>
              <div>{stats.successRate} % (≥ 50%)</div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold">Temps moyen</div>
              <div>{formatSeconds(stats.avgTime)}</div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold">Nombre de tentatives</div>
              <div>
                {stats.validAttempts} valides / {stats.totalAttempts} au total
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques globales</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pas encore assez de tentatives valides pour calculer des statistiques.
          </CardContent>
        </Card>
      )}

      {/* Liste des tentatives */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tentatives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!attempts.length && (
            <div className="text-muted-foreground">
              Aucune tentative enregistrée pour ce test.
            </div>
          )}

          {attempts.map((a) => (
            <div
              key={a.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded px-3 py-2"
            >
              <div className="space-y-1">
                <div className="font-medium">
                  {a.student?.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    (Tentative {a.attempt_number})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Score : {a.score ?? "—"} / {test.grade_value} — Temps :{" "}
                  {formatSeconds(a.time_spent_seconds)}
                </div>
                <div className="text-xs">
                  Valide :{" "}
                  <span className={a.is_valid ? "text-green-600" : "text-red-600"}>
                    {a.is_valid ? "Oui" : "Non (invalidée)"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {a.is_valid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => invalidateAttempt(a.id)}
                  >
                    Invalider
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
