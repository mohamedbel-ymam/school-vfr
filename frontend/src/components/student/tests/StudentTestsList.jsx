import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function StudentTestsList() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/eleve/tests")
      .then((res) => setTests(res.data))
      .catch(() => toast.error("Impossible de charger les tests disponibles."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tests disponibles</h2>

      {tests.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Aucun test n’est disponible pour le moment.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {tests.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <p className="text-sm">Durée : {t.global_time_minutes} min</p>

              <Button
                onClick={() => navigate(`/élève/tests/${t.id}/start`)}
                className="w-full"
              >
                Commencer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
