// src/components/admin/pages/ManageStudents.jsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs.js";
import { Separator } from "../../ui/separator.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.js";
import { Button } from "../../ui/button.js";
import { Input } from "../../ui/input.js";
import { ReloadIcon } from "@radix-ui/react-icons";

import StudentUpsertForm from "../forms/StudentUpsertForm.jsx";
import AdminStudentsList from "../data-table/AdminStudentsList.jsx";
import UserApi from "../../../services/api/UserApi.js";
import GroupApi from "../../../services/api/admin/GroupApi.js"; // ✅ new import

// ---------- helpers ----------
function extractParentIds(values) {
  const ids = new Set();
  const push = (v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  };

  if (values?.parent_id != null && values.parent_id !== "") push(values.parent_id);

  const arrCandidates = [values?.parentIds, values?.parent_ids, values?.parents].filter(Boolean);
  for (const arr of arrCandidates) {
    if (Array.isArray(arr)) {
      for (const x of arr) {
        if (x && typeof x === "object") push(x.id);
        else push(x);
      }
    }
  }
  return Array.from(ids);
}

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]); // ✅ new
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [tab, setTab] = useState("students_list");
  const [q, setQ] = useState("");

  const total = useMemo(() => students.length, [students]);

  const loadStudents = async (search = "") => {
    setLoading(true);
    try {
      const resp = await UserApi.students({ q: search });
      setStudents(resp.list);
    } catch (e) {
      console.error("Erreur de chargement des élèves:", e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await GroupApi.list();
      setGroups(res?.data ?? []);
    } catch (e) {
      console.error("Erreur de chargement des groupes:", e);
      setGroups([]);
    }
  };

  useEffect(() => {
    loadStudents();
    loadGroups(); // ✅ load once
  }, []);

  const handleSaveStudent = async (values) => {
    const parentIds = extractParentIds(values);
    const payload = { ...values, role: "student" };

    delete payload.parent_id;
    delete payload.parentIds;
    delete payload.parent_ids;
    delete payload.parents;

    // Normalize degree + group IDs
    payload.degree_id = values.degree_id ? Number(values.degree_id) : null;
    payload.group_id = values.group_id ? Number(values.group_id) : null; // ✅ new optional

    const res = editingStudent
      ? await UserApi.update(values.id, payload)
      : await UserApi.create(payload);

    const studentId =
      values?.id ??
      res?.data?.id ??
      res?.data?.student?.id ??
      res?.id ??
      res?.student?.id;

    if (studentId && parentIds.length) {
      try {
        await UserApi.linkParents(Number(studentId), parentIds);
      } catch (e) {
        console.warn("Linking parents failed (non-fatal):", e);
      }
    }

    await loadStudents(q);
    setEditingStudent(null);
    setTab("students_list");
    return res;
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setTab("add_student");
  };

  const handleCancelEdit = async () => {
    setEditingStudent(null);
    setTab("students_list");
    await loadStudents(q);
  };

  return (
    <div className="space-y-6">
      {/* Header / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Total élèves</CardTitle></CardHeader>
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
                onKeyDown={(e) => e.key === "Enter" && loadStudents(q)}
              />
            </div>
            <Button variant="secondary" onClick={() => loadStudents(q)}>
              {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Rafraîchir
            </Button>
            <Button onClick={() => { setEditingStudent(null); setTab("add_student"); }}>
              Ajouter un élève
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="students_list">Élèves</TabsTrigger>
          <TabsTrigger value="add_student">{editingStudent ? "Modifier l’élève" : "Ajouter un élève"}</TabsTrigger>
        </TabsList>

        <TabsContent value="students_list" className="mt-2">
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <AdminStudentsList data={students} onEdit={handleEditStudent} />
              )}
              {!loading && students.length === 0 && (
                <div className="text-sm text-muted-foreground mt-2">Aucun élève trouvé.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Separator />

        <TabsContent value="add_student" className="mt-2">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {editingStudent ? "Modifier l’élève" : "Créer un élève"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                <StudentUpsertForm
                  handleSubmit={handleSaveStudent}
                  values={editingStudent}
                  onCancel={handleCancelEdit}
                  groups={groups} // ✅ pass to form
                />
                {editingStudent && (
                  <div className="mt-2">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Annuler la modification
                    </Button>
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
