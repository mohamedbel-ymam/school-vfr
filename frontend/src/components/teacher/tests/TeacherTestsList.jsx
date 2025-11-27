import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { axiosClient } from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function TeacherTestsList() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axiosClient.get("/teacher/tests")
      .then((res) => setTests(res.data))
      .catch(() => toast.error("Failed to load tests"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">Mes Examens</h2>
        <Button onClick={() => navigate("/enseignant/tests/create")}>
          + Creer un nouveau examen
        </Button>
      </div>

      {tests.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No tests created yet. Click “Create New Test”.
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {tests.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {t.description?.slice(0, 120)}…
              </div>

              <div className="flex gap-2 flex-wrap mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/enseignant/tests/${t.id}/questions`)}
                >
                  Modifier les questions
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/enseignant/tests/${t.id}/assign`)}
                >
                  Attribuer les étudiants
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/enseignant/tests/${t.id}/review`)}
                >
                  Vérifier et activer
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate(`/enseignant/tests/${t.id}/results`)}
                >
                  Resultats
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
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