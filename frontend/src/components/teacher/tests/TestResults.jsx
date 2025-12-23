import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function TestResults() {
  const { id: testId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const sorted = useMemo(() => {
    // Keep newest attempt_number first (already done by backend, but safe)
    return [...attempts].sort(
      (a, b) => (b.attempt_number ?? 0) - (a.attempt_number ?? 0)
    );
  }, [attempts]);

  useEffect(() => {
    setLoading(true);
    axiosClient
      .get(`/enseignant/tests/${testId}/results`)
      .then((res) => setAttempts(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Failed to load results"))
      .finally(() => setLoading(false));
  }, [testId]);

  const invalidate = async (attemptId) => {
    try {
      await axiosClient.delete(`/enseignant/tests/attempts/${attemptId}`);
      toast.success("Attempt invalidated");
      // backend returns attempt_id, not id
      setAttempts((prev) => prev.filter((a) => a.attempt_id !== attemptId));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to invalidate");
    }
  };

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats du test</CardTitle>
        <h3 className="text-lg font-semibold">{test.title}</h3>
      </CardHeader>

      <CardContent className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Aucun résultat pour le moment.
          </div>
        ) : (
          sorted.map((a) => (
            <div
              key={a.attempt_id}
              className="border rounded p-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {a.student_fullname || "—"}
                </div>

                <div className="text-muted-foreground text-sm">
                  Tentative: {a.attempt_number ?? "—"} • Score:{" "}
                  {a.score ?? "—"}
                </div>

                <div className="text-xs">
                  Temps écoulé: {formatDuration(a.time_spent_seconds)}{" "}
                  ({a.time_spent_seconds ?? 0}s)
                </div>

                {!a.is_valid && (
                  <div className="text-xs text-red-600 mt-1">
                    Tentative invalidée
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                onClick={() => invalidate(a.attempt_id)}
                disabled={a.is_valid === false}
              >
                Invalider
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
