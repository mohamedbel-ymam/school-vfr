import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs.jsx";
import { Separator } from "../../ui/separator.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.jsx";
import { Button } from "../../ui/button.jsx";
import { Input } from "../../ui/input.jsx";
import { ReloadIcon } from "@radix-ui/react-icons";

import TeacherUpsertForm from "../forms/TeacherUpsertForm.jsx";
import AdminTeacherList from "../data-table/AdminTeacherList.jsx";
import UserApi from "../../../services/api/UserApi.js";

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [tab, setTab] = useState("teacher_list");
  const [q, setQ] = useState("");

  const total = useMemo(() => teachers.length, [teachers]);

  const loadTeachers = async (search = "") => {
    setLoading(true);
    try {
      const resp = await UserApi.teachers({ q });
      setTeachers(resp.list);
    } catch (e) {
      console.error("Erreur de chargement des enseignants:", e);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeachers(); }, []);

  const handleSaveTeacher = async (values) => {
    // always send normalized role
    const res = editingTeacher
     ? await UserApi.update(values.id, { ...values, role: "teacher" })
    : await UserApi.create({ ...values, role: "teacher" });
    await loadTeachers(q);
    setEditingTeacher(null);
    setTab("teacher_list");
    return res;
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setTab("add_teacher");
  };

  const handleCancelEdit = async () => {
    setEditingTeacher(null);
    setTab("teacher_list");
    await loadTeachers(q);
  };

  return (
    <div className="space-y-6">
      {/* Header / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Total enseignants</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{total}</div></CardContent>
        </Card>

        <Card className="rounded-2xl md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="Rechercher (nom, prénom, email)…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTeachers(q)}
              />
            </div>
            <Button variant="secondary" onClick={() => loadTeachers(q)}>
              {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Rafraîchir
            </Button>
            <Button onClick={() => { setEditingTeacher(null); setTab("add_teacher"); }}>
              Ajouter un enseignant
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="teacher_list">Tous les enseignants</TabsTrigger>
          <TabsTrigger value="add_teacher">{editingTeacher ? "Modifier enseignant" : "Ajouter enseignant"}</TabsTrigger>
        </TabsList>

        <TabsContent value="teacher_list" className="mt-2">
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <AdminTeacherList data={teachers} onEdit={handleEditTeacher} />
              )}
              {!loading && teachers.length === 0 && (
                <div className="text-sm text-muted-foreground mt-2">Aucun enseignant trouvé.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Separator />

        <TabsContent value="add_teacher" className="mt-2">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{editingTeacher ? "Modifier enseignant" : "Créer un enseignant"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                <TeacherUpsertForm
                  handleSubmit={handleSaveTeacher}
                  values={editingTeacher}
                  onCancel={handleCancelEdit}
                />
                {editingTeacher && (
                  <div className="mt-2">
                    <Button variant="outline" onClick={handleCancelEdit}>Annuler la modification</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
