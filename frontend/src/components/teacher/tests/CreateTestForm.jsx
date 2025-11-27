import { useState, useEffect } from "react";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem
} from "../../ui/select";

import { axiosClient } from "../../../api/axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CreateTestForm() {
  const [loading, setLoading] = useState(false);
  const [degrees, setDegrees] = useState([]);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    degree_id: "",
    global_time_minutes: "",
    question_time_minutes: "",
    total_questions: "",
    grade_value: "",
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* -----------------------------------
     Charger les degrés depuis backend
  ------------------------------------- */
  useEffect(() => {
    async function loadDegrees() {
      try {
        const res = await axiosClient.get("/degrees");
        setDegrees(res.data.data || res.data || []); 
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger les niveaux scolaires.");
      }
    }

    loadDegrees();
  }, []);

  /* -----------------------------------
     Soumission du formulaire
  ------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axiosClient.post("/teacher/tests", form);
      toast.success("Test créé avec succès !");

      navigate(`/enseignant/tests/${res.data.id}/questions`);
    } catch (err) {
      console.error(err);
      toast.error("Échec lors de la création du test.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Créer un nouveau test</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <Input
          placeholder="Titre du test"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
        />

        <Textarea
          placeholder="Description (optionnelle)"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />

        {/* ------- DEGRÉS (dynamiques) ------- */}
        <div>
          <label className="text-sm font-medium mb-1 block">Niveau / Classe</label>
          <Select onValueChange={(v) => updateField("degree_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir le degré" />
            </SelectTrigger>

            <SelectContent>
              {degrees.length === 0 && (
                <div className="text-muted-foreground px-2 py-1 text-sm">
                  Aucun degré disponible
                </div>
              )}

              {degrees.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          type="number"
          placeholder="Temps global (minutes)"
          value={form.global_time_minutes}
          onChange={(e) => updateField("global_time_minutes", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Temps par question (optionnel)"
          value={form.question_time_minutes}
          onChange={(e) => updateField("question_time_minutes", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Nombre total de questions"
          value={form.total_questions}
          onChange={(e) => updateField("total_questions", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Note maximale (ex: 20)"
          value={form.grade_value}
          onChange={(e) => updateField("grade_value", e.target.value)}
        />

        <Button disabled={loading} className="w-full">
          {loading ? "Création..." : "Créer le test"}
        </Button>
      </form>
    </div>
  );
}
