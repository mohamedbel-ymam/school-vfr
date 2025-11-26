import { useEffect, useState } from "react";
import { axiosClient } from "../../../api/axios";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";

export default function TestResult() {
  const { id: attemptId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosClient
      .get(`/student/attempts/${attemptId}/result`)
      .then((res) => setData(res.data));
  }, [attemptId]);

  if (!data) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultat du test</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xl font-bold">
          Score : {data.score} / {data.max_score}
        </div>

        <p className="text-sm text-muted-foreground">
          Temps utilisé : {data.time_spent_seconds}s
        </p>

        <h3 className="font-semibold mt-3">Détails :</h3>

        <div className="space-y-3">
          {data.answers.map((a, i) => (
            <div key={i} className="p-3 border rounded">
              <div dangerouslySetInnerHTML={{ __html: a.question_statement }} />

              <div className="text-sm mt-2">
                Votre réponse :
                <span className={a.is_correct ? "text-green-600" : "text-red-600"}>
                  {a.student_answer}
                </span>
              </div>

              {!a.is_correct && (
                <div className="text-sm text-green-700">
                  Réponse correcte : {a.correct_answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
