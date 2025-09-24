import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs.jsx";
import { Separator } from "../../ui/separator.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card.jsx";
import { Button } from "../../ui/button.jsx";
import { Input } from "../../ui/input.jsx";
import { ReloadIcon } from "@radix-ui/react-icons";

import ParentUpsertForm from "../forms/ParentUpsertForm.jsx";


import AdminParentList from "../data-table/AdminParentList.jsx";
import UserApi from "../../../services/api/UserApi.js";


export default function ManageParents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [tab, setTab] = useState("parents_list");
  const [q, setQ] = useState("");

  const total = useMemo(() => parents.length, [parents]);

  const loadParents = async (search = "") => {
    setLoading(true);
    try {
     const resp = await UserApi.parents({ q });
      setParents(resp.list);
    } catch (e) {
      console.error("Erreur de chargement des parents:", e);
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadParents(); }, []);

  const handleSaveParent = async (values) => {
    const res = editingParent
   ? await UserApi.update(values.id, { ...values, role: "parent" })
  : await UserApi.create({ ...values, role: "parent" });
    await loadParents(q);
    setEditingParent(null);
    setTab("parents_list");
    return res;
  };

  const handleEditParent = (parent) => {
    setEditingParent(parent);
    setTab("add_parent");
  };

  const handleCancelEdit = async () => {
    setEditingParent(null);
    setTab("parents_list");
    await loadParents(q);
  };

  return (
    <div className="space-y-6">
      {/* Header / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Total parents</CardTitle></CardHeader>
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
                onKeyDown={(e) => e.key === "Enter" && loadParents(q)}
              />
            </div>
            <Button variant="secondary" onClick={() => loadParents(q)}>
              {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Rafraîchir
            </Button>
            <Button onClick={() => { setEditingParent(null); setTab("add_parent"); }}>
              Ajouter un parent
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="parents_list">Tous les parents</TabsTrigger>
          <TabsTrigger value="add_parent">{editingParent ? "Modifier parent" : "Ajouter parent"}</TabsTrigger>
        </TabsList>

        <TabsContent value="parents_list" className="mt-2">
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <AdminParentList data={parents} onEdit={handleEditParent} />
              )}
              {!loading && parents.length === 0 && (
                <div className="text-sm text-muted-foreground mt-2">Aucun parent trouvé.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Separator />

        <TabsContent value="add_parent" className="mt-2">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{editingParent ? "Modifier parent" : "Créer un parent"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                <ParentUpsertForm
                  handleSubmit={handleSaveParent}
                  values={editingParent}
                  onCancel={handleCancelEdit}
                />
                {editingParent && (
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
