import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";
function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m} min ${sec.toString().padStart(2, "0")} s`;
}
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
  const sorted = useMemo(() => {
    // Keep newest attempt_number first (already done by backend, but safe)
    return [...attempts].sort(
      (a, b) => (b.attempt_number ?? 0) - (a.attempt_number ?? 0)
    );
  }, [attempts]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultat du test</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xl font-bold">Score : {data.score}</div>
      
      </CardContent>
    </Card>
  );
}
