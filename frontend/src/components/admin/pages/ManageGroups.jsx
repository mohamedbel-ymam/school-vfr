import { useEffect, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../../../components/ui/select";
import { toast } from "sonner";

import GroupApi from "../../../services/api/admin/GroupApi";
import DegreeApi from "../../../services/api/admin/DegreeApi";
import StudentApi from "../../../services/api/admin/StudentApi";

export default function ManageGroups() {
  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */

  const [degrees, setDegrees] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    degree_id: "",
    name: "",
    slug: "",
  });

  const [assigning, setAssigning] = useState({
    group_id: "",
    student_id: "",
    degree_id: "",
  });

  /* ------------------------------------------------------------------ */
  /* Fetch base data                                                     */
  /* ------------------------------------------------------------------ */

  const fetchBase = async () => {
    try {
      const [degRes, grpRes] = await Promise.all([
        DegreeApi.list(),
        GroupApi.list(),
      ]);

      setDegrees(degRes.data.data ?? degRes.data);
      setGroups(grpRes.data.data ?? grpRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement des données.");
    }
  };

  useEffect(() => {
    fetchBase();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Load students WHEN a group is selected                              */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!assigning.degree_id) {
      setStudents([]);
      return;
    }

    StudentApi.list({ degree_id: assigning.degree_id, per_page: 999 })
      .then((res) => {
        setStudents(res.data.data ?? res.data);
      })
      .catch(() => {
        setStudents([]);
      });
  }, [assigning.degree_id]);

  /* ------------------------------------------------------------------ */
  /* Create / Update Group                                              */
  /* ------------------------------------------------------------------ */

  const saveGroup = async () => {
    if (!form.name || !form.slug || !form.degree_id) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    try {
      if (editing) {
        await GroupApi.update(editing.id, form);
        toast.success("Groupe mis à jour.");
      } else {
        await GroupApi.create(form);
        toast.success("Groupe créé.");
      }

      setOpen(false);
      setEditing(null);
      setForm({ degree_id: "", name: "", slug: "" });
      fetchBase();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l’enregistrement.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Delete group                                                       */
  /* ------------------------------------------------------------------ */

  const deleteGroup = async (id) => {
    if (!confirm("Supprimer ce groupe ?")) return;

    try {
      await GroupApi.delete(id);
      toast.success("Groupe supprimé.");
      fetchBase();
    } catch (e) {
      console.error(e);
      toast.error("Suppression impossible.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Assign student to group                                            */
  /* ------------------------------------------------------------------ */

  const assignStudent = async () => {
    if (!assigning.group_id || !assigning.student_id) {
      toast.error("Sélectionnez un groupe et un étudiant.");
      return;
    }

    try {
      await StudentApi.assignToGroup(assigning.student_id, assigning.group_id);
      toast.success("Étudiant assigné au groupe.");

      setAssigning({
        group_id: "",
        student_id: "",
        degree_id: "",
      });

      setStudents([]);
      fetchBase();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l’affectation.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="p-6 space-y-8">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Groupes</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ degree_id: "", name: "", slug: "" });
              }}
            >
              + Nouveau Groupe
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modifier le Groupe" : "Nouveau Groupe"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <Select
                value={form.degree_id}
                onValueChange={(v) => setForm({ ...form, degree_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {degrees.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Nom du groupe (ex: Groupe A)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Input
                placeholder="Slug unique (ex: bac2-info-a)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />

              <div className="flex justify-end">
                <Button onClick={saveGroup}>
                  {editing ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ================= GROUPS BY DEGREE ================= */}
      {degrees.map((deg) => {
        const degGroups = groups.filter((g) => g.degree_id === deg.id);

        return (
          <Card key={deg.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle>{deg.name}</CardTitle>
            </CardHeader>

            <CardContent>
              {degGroups.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun groupe pour ce niveau.
                </p>
              ) : (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Nom</th>
                      <th className="p-2 text-left">Slug</th>
                      <th className="p-2">Étudiants</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {degGroups.map((g) => (
                      <tr key={g.id} className="border-t">
                        <td className="p-2">{g.name}</td>
                        <td className="p-2">{g.slug}</td>
                        <td className="p-2 text-center">
                          {g.students?.length ?? 0}
                        </td>
                        <td className="p-2 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(g);
                              setForm(g);
                              setOpen(true);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteGroup(g.id)}
                          >
                            Supprimer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ================= ASSIGN STUDENT ================= */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Affecter un étudiant à un groupe</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-3 flex-wrap items-end">
          {/* Group */}
          <Select
            value={assigning.group_id}
            onValueChange={(groupId) => {
              const g = groups.find(
                (x) => String(x.id) === String(groupId)
              );

              setAssigning({
                group_id: groupId,
                student_id: "",
                degree_id: g?.degree_id ?? "",
              });
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choisir un groupe" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Student */}
          <Select
            value={assigning.student_id}
            onValueChange={(v) =>
              setAssigning({ ...assigning, student_id: v })
            }
            disabled={!assigning.group_id}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un étudiant" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.firstname} {s.lastname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={assignStudent}>Assigner</Button>
        </CardContent>
      </Card>
    </div>
  );
}
