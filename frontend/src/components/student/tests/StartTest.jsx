import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

export default function StartTest() {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const start = async () => {
    try {
      const res = await axiosClient.post(`/student/tests/${testId}/start`);
      navigate(`/élève/tests/attempt/${res.data.attempt_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Impossible de démarrer le test.");
    }
  };

  useEffect(() => {
    axiosClient
      .get(`/teacher/tests/${testId}`)
      .then((res) => setTest(res.data.test))
      .catch(() => toast.error("Impossible de charger le test."))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Démarrer le test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-semibold">{test.title}</h3>

        <p className="text-sm text-muted-foreground">{test.description}</p>

        <div className="text-sm space-y-1">
          <p>Durée totale : {test.global_time_minutes} min</p>
          <p>Nombre de questions : {test.total_questions}</p>
        </div>

        <Button className="w-full" onClick={start}>
          Commencer maintenant
        </Button>
      </CardContent>
    </Card>
  );
}
