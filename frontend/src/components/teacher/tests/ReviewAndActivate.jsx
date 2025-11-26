import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";

export default function ReviewAndActivate() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    axiosClient
      .get(`/teacher/tests/${testId}/review`) // backend method needed
      .then((res) => {
        setTest(res.data.test);
        setQuestions(res.data.questions);
        setAssignments(res.data.assignments);
      })
      .catch(() => toast.error("Failed to load test"));
  }, [testId]);

  const activate = async () => {
    try {
      await axiosClient.post(`/teacher/tests/${testId}/activate`);
      toast.success("Test activated!");
      navigate(`/enseignant/tests/${testId}/results`);
    } catch (err) {
      toast.error("Activation failed");
    }
  };

  if (!test) return <div className="p-4">Chargement…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Activate</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div><strong>Title:</strong> {test.title}</div>
        <div><strong>Description:</strong> {test.description}</div>
        <div><strong>Questions:</strong> {questions.length}</div>
        <div><strong>Assigned Students:</strong> {assignments.length}</div>
        <div><strong>Timer:</strong> {test.global_time_minutes} minutes</div>
        <div><strong>Grade:</strong> {test.grade_value}</div>

        <Button onClick={activate} className="w-full">
          Activate Test
        </Button>
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