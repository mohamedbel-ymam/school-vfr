import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";

export default function TestResult() {
  const { id: testId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosClient
      .get(`/eleve/tests/${testId}/result`)
      .then((res) => setData(res.data))
      .catch(() => console.log("Error loading result"));
  }, [testId]);

  if (!data) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultat du test</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xl font-bold">Score : {data.score}</div>
        <p className="text-sm text-muted-foreground">
          Temps utilisé : {data.time_spent_seconds}s
        </p>
      </CardContent>
    </Card>
  );
}
