import { useEffect, useState } from "react";
import DegreeApi from "../../../services/api/admin/DegreeApi";
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

  /* ---- Charger les degrés ---- */
  useEffect(() => {
    DegreeApi.publicList()
      .then((res) => setDegrees(res.data?.data || res.data || []))
      .catch(() => toast.error("Impossible de charger les degrés."));
  }, []);

  /* ---- Charger les élèves ---- */
  const loadStudents = (degreeId) => {
    setSelectedDegree(degreeId);
    setSelectedStudents([]);

    axiosClient
      .get(`/enseignant/tests/students?degree_id=${degreeId}`)
      .then((res) => {
        setStudents(res.data.data || res.data || []);
      })
      .catch(() => toast.error("Impossible de charger les élèves."));
  };

  /* ---- Sélection d’un élève ---- */
  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ---- Tout sélectionner ---- */
  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  /* ---- Envoyer l’attribution ---- */
  const assign = async () => {
    if (!selectedStudents.length) {
      toast.error("Sélectionnez au moins un élève.");
      return;
    }

    try {
      await axiosClient.post(`/enseignant/tests/${testId}/assign`, {
        student_ids: selectedStudents,    

      });

      toast.success("Test attribué avec succès !");
      navigate("/enseignant/tableau-de-bord");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'attribution.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Attribuer le test aux élèves</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ---- Sélection du diplôme ---- */}
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

          {/* ---- Liste des élèves ---- */}
          {selectedDegree && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">
                  Élèves ({students.length})
                </h3>

                {students.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleAll}
                  >
                    {selectedStudents.length === students.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </Button>
                )}
              </div>

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

                    <span>
                      {s.firstname} {s.lastname}
                    </span>
                  </label>
                ))}

                {students.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Aucun élève trouvé.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- Bouton final ---- */}
          <Button className="w-full" onClick={assign}>
            Activer le test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
