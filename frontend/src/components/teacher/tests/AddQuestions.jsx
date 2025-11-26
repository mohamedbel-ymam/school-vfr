import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import TipTapEditor from "../../ui/TipTapEditor.jsx"; // ➜ UTILISE Tiptap

import { axiosClient } from "../../../api/axios";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";

export default function AddQuestions() {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [statement, setStatement] = useState(""); // texte riche
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [categoryInput, setCategoryInput] = useState("");
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);

  const [saving, setSaving] = useState(false);

  /* --------- Charger test + questions --------- */
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await axiosClient.get(`/teacher/tests/${testId}`);

        if (!ignore) {
          setTest(res.data.test);
          setQuestions(res.data.questions || []);
        }
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger le test.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [testId]);

  /* --------- Helpers --------- */

  const updateOption = (index, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const addOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      toast.error("Au moins deux options sont requises.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
    if (correctIndex === index) setCorrectIndex(0);
  };

  const addCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setCategoryInput("");
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setCategoryInput("");
  };

  const removeCategory = (cat) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  /* --------- Upload d'image --------- */

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await axiosClient.post(
          `/teacher/tests/${testId}/upload-image`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setImages((prev) => [...prev, res.data.url]);
      } catch (err) {
        console.error(err);
        toast.error("Échec de l’upload de l’image.");
      }
    }
    e.target.value = "";
  };

  const removeImage = (url) => {
    setImages((prev) => prev.filter((i) => i !== url));
  };

  /* --------- Sauvegarder question --------- */

  const handleSaveQuestion = async () => {
    if (!statement.trim()) {
      toast.error("Le texte de la question est obligatoire.");
      return;
    }
    if (options.some((o) => !o.trim())) {
      toast.error("Toutes les options doivent être remplies.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        statement,
        options,
        correct_index: correctIndex,
        difficulty,
        categories,
        images,
      };

      const res = await axiosClient.post(
        `/teacher/tests/${testId}/questions`,
        payload
      );

      setQuestions((prev) => [...prev, res.data]);
      toast.success("Question ajoutée.");

      // reset
      setStatement("");
      setOptions(["", ""]);
      setCorrectIndex(0);
      setImages([]);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const goAssignStudents = () => {
    navigate(`/enseignant/tests/${testId}/assign`);
  };

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>
            Création des questions –{" "}
            <span className="font-normal">{test?.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-sm text-muted-foreground">
            Questions prévues : {test?.total_questions ?? "—"} | Note finale :{" "}
            {test?.grade_value}
          </div>
          <Button variant="outline" onClick={goAssignStudents}>
            Étape suivante : Attribuer aux élèves
          </Button>
        </CardContent>
      </Card>

      {/* Créateur de question */}
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question */}
          <div>
            <div className="mb-2 text-sm font-medium">Texte de la question</div>
            <TipTapEditor value={statement} onChange={setStatement} />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Options</div>
              <Button size="sm" variant="outline" onClick={addOption}>
                + Ajouter une option
              </Button>
            </div>

            {options.map((opt, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded border ${
                  correctIndex === index
                    ? "border-green-500"
                    : "border-gray-200"
                }`}
              >
                <Button
                  type="button"
                  size="icon"
                  variant={correctIndex === index ? "default" : "outline"}
                  onClick={() => setCorrectIndex(index)}
                  className="mt-1 shrink-0"
                >
                  {String.fromCharCode(65 + index)}
                </Button>

                <div className="flex-1">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeOption(index)}
                  className="mt-1 shrink-0"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          {/* Difficulté */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Difficulté</span>
              <span className="text-sm text-muted-foreground">
                {difficulty} / 5
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>

          {/* Catégories */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Catégories</div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter une catégorie"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <Button type="button" onClick={addCategory}>
                Ajouter
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeCategory(cat)}
                >
                  {cat} ✕
                </Badge>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Images</div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />

            <div className="flex flex-wrap gap-3 mt-2">
              {images.map((url) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt="question"
                    className="w-24 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-1 text-xs"
                    onClick={() => removeImage(url)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div className="pt-2">
            <Button
              onClick={handleSaveQuestion}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Enregistrement…" : "Enregistrer la question"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des questions */}
      <Card>
        <CardHeader>
          <CardTitle>
            Questions du test ({questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {questions.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Aucune question pour l’instant.
            </div>
          )}

          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="border rounded p-2 flex flex-col gap-1 bg-slate-50"
            >
              <div className="flex justify-between text-sm">
                <span className="font-semibold">
                  Q{q.order ?? idx + 1} — Difficulté {q.difficulty ?? 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  Options : {q.options?.length ?? "—"}
                </span>
              </div>

              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: (q.statement || "").slice(0, 200) + "...",
                }}
              />

              {q.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.categories.map((cat) => (
                    <Badge key={cat} variant="outline">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
