import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

export default function TestResults() {
  const { id: testId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get(`/enseignant/tests/${testId}/results`)
      .then((res) => setAttempts(res.data))
      .catch(() => toast.error("Failed to load results"))
      .finally(() => setLoading(false));
  }, [testId]);

  const invalidate = async (attemptId) => {
    try {
      await axiosClient.delete(`/enseignant/tests/attempts/${attemptId}`);
      toast.success("Attempt invalidated");
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch {
      toast.error("Failed to invalidate");
    }
  };

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultat du test</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {attempts.map((a) => (
          <div key={a.id} className="border rounded p-3 flex justify-between">
            <div>
              <div className="font-semibold">{a.student.name}</div>
              <div className="text-muted-foreground text-sm">
                Score: {a.score}
              </div>
              <div className="text-xs">
                Temps: {a.time_spent_seconds}s
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => invalidate(a.id)}
            >
              Invalider
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
/*
“Ajouter une question”

“Enregistrer”

“Attribuer aux élèves”

“Activer le test”

“Uploader une image”

“Difficulté”

“Catégories”

“Options”

“Corriger”

“Résultats”

“Temps écoulé”
*/