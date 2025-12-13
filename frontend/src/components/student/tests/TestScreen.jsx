import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardContent, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

export default function TestScreen() {
  const { id: attemptId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);

  const [remaining, setRemaining] = useState(null);

  /* Charger */
  useEffect(() => {
    axiosClient
      .get(`/eleve/attempts/${attemptId}`)
      .then((res) => {
        setData(res.data);
        setRemaining(res.data.remaining_seconds);
      })
      .catch(() => toast.error("Impossible de charger le test."));
  }, [attemptId]);

  /* Timer */
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) return submit();

    const t = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const save = async () => {
    const q = data.questions[index];

    await axiosClient.post(`/eleve/attempts/${attemptId}/answer`, {
      question_id: q.id,
      answer: selected,
    });
  };

  const next = async () => {
    if (selected === null) {
      toast.error("Choisissez une réponse.");
      return;
    }
    await save();
    setSelected(null);
    setIndex((i) => i + 1);
  };

  const submit = async () => {
    try {
      await axiosClient.post(`/eleve/attempts/${attemptId}/submit`);
      navigate(`/élève/tests/resultat/${attemptId}`);
    } catch {
      toast.error("Erreur lors de la soumission.");
    }
  };

  if (!data) return <div className="p-4">Chargement…</div>;

  const q = data.questions[index];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold">{data.test.title}</h2>
            <p className="text-sm">Question {index + 1}/{data.questions.length}</p>
          </div>
          <div className="text-xl font-bold text-red-600">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle dangerouslySetInnerHTML={{ __html: q.statement }} />
        </CardHeader>

        <CardContent className="space-y-3">
          {q.images?.map((img) => (
            <img key={img} src={img} alt="" className="rounded-md border" />
          ))}

          {q.options.map((opt, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              className={`p-3 rounded border cursor-pointer ${
                selected === i ? "bg-blue-100 border-blue-500" : "border-gray-200"
              }`}
              dangerouslySetInnerHTML={{ __html: opt }}
            />
          ))}
        </CardContent>
      </Card>

      {index + 1 < data.questions.length ? (
        <Button className="w-full" onClick={next}>
          Suivant
        </Button>
      ) : (
        <Button className="w-full" onClick={submit}>
          Terminer le test
        </Button>
      )}
    </div>
  );
}
