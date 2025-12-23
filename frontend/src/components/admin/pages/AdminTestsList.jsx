import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AdminTestsList() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axiosClient
      .get("/admin/tests")
      .then((res) => setTests(res.data))
      .catch(() => toast.error("Impossible de charger la liste des tests."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;

  if (!tests.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aucun test n’a encore été créé.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Suivi des tests</h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tests.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                Enseignant :{" "}
                <span className="font-medium">
                  {t.teacher
                    ? `${t.teacher.firstname} ${t.teacher.lastname}`
                    : "—"}
                </span>              </div>
              <div>Note sur : {t.grade_value}</div>
              <div>Durée : {t.global_time_minutes} min</div>
              <div>
                Statut :{" "}
                <span className={t.is_active ? "text-green-600" : "text-amber-600"}>
                  {t.is_active ? "Actif" : "Inactif"}
                </span>
              </div>

              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => navigate(`/admin/tests/${t.id}`)}
              >
                Voir détails & statistiques
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
