import { useState } from "react";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "../../ui/select";
import { axiosClient } from "../../../api/axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CreateTestForm() {
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axiosClient.post("/teacher/tests", form);
      toast.success("Test created successfully!");

      navigate(`/teacher/tests/${res.data.id}/questions`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create test.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Create New Test</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <Input
          placeholder="Test Title"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
        />

        <Textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />

        {/* Degree Selection */}
        <Select onValueChange={(v) => updateField("degree_id", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select Degree" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1ère Bac Sciences Exp</SelectItem>
            <SelectItem value="2">1ère Bac Sciences Maths</SelectItem>
            <SelectItem value="3">2ème Bac Sciences Physiques</SelectItem>
            <SelectItem value="4">College - Tronc Commun</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Global time (minutes)"
          value={form.global_time_minutes}
          onChange={(e) => updateField("global_time_minutes", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Time per question (optional)"
          value={form.question_time_minutes}
          onChange={(e) => updateField("question_time_minutes", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Total number of questions"
          value={form.total_questions}
          onChange={(e) => updateField("total_questions", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Grade value (e.g. 20)"
          value={form.grade_value}
          onChange={(e) => updateField("grade_value", e.target.value)}
        />

        <Button disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Test"}
        </Button>
      </form>
    </div>
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