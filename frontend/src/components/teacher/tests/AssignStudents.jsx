import { useEffect, useState } from "react";
import DegreeApi from "../../../services/api/Admin/DegreeApi";
import StudentApi from "../../../services/api/admin/StudentApi";
import { axiosClient } from "../../../api/axios";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { toast } from "sonner";

export default function AssignStudents() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [degrees, setDegrees] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  /* Charger les degrés existants */
  useEffect(() => {
    DegreeApi.publicList()
      .then((res) => setDegrees(res.data))
      .catch(() => toast.error("Impossible de charger les degrés."));
  }, []);

  /* Charger les élèves pour le degré sélectionné */
  const loadStudents = (degreeId) => {
    setSelectedDegree(degreeId);
    setSelectedStudents([]);

    StudentApi.list({ degree_id: degreeId })
      .then((res) => {
        setStudents(res.data.data || res.data); // support pagination or not
      })
      .catch(() => toast.error("Impossible de charger les élèves."));
  };

  /* Toggle */
  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /* Attribuer le test */
  const assign = async () => {
    if (!selectedStudents.length) {
      toast.error("Sélectionnez au moins un élève.");
      return;
    }

    try {
      await axiosClient.post(`/teacher/tests/${testId}/assign`, {
        student_ids: selectedStudents,
      });

      toast.success("Test activé pour les élèves sélectionnés.");
      navigate("/enseignant/tableau de bord");
    } catch (err) {
      toast.error("Erreur lors de l'activation du test.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Attribuer le test aux élèves</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Sélection du degré */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Sélectionner un degré :</label>

            <select
              className="border rounded px-2 py-2"
              value={selectedDegree}
              onChange={(e) => loadStudents(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {degrees.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Liste des élèves */}
          {selectedDegree && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Élèves du degré ({students.length})
              </h3>

              <div className="border rounded p-2 max-h-72 overflow-y-auto space-y-1">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 p-1 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedStudents.includes(s.id)}
                      onCheckedChange={() => toggleStudent(s.id)}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}

                {!students.length && (
                  <div className="text-xs text-muted-foreground">
                    Aucun élève trouvé.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bouton final */}
          <Button className="w-full" onClick={assign}>
            Activer le test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
