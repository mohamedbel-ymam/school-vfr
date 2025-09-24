// frontend/src/components/admin/ManageAdmin.jsx
import { useMemo, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Input } from "../../ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "../../ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "../../ui/tabs";
import { Users, UserPlus, ShieldMinus, Search, Pencil } from "lucide-react";
import AdminUpsert from "../forms/AdminUpsertForm";
import AdminApi from "../../../services/api/AdminApi";

const fmtName = (u) => `${u?.firstname ?? ""} ${u?.lastname ?? ""}`.trim();

export default function ManageAdmin({
  loading = false,
  admins = [],
  candidates = [],
  onAssign,            // (userId) => Promise|void
  onRevoke,            // (userId) => Promise|void
  onCreated,           // (payload) => Promise|void (optional)
  onUpdated,           // (userId, payload) => Promise|void (optional)
}) {
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return (candidates || []).filter(c =>
      c.email?.toLowerCase().includes(q) ||
      fmtName(c).toLowerCase().includes(q)
    );
  }, [candidates, search]);

  async function handleCreate(values) {
    setSubmitting(true);
    try {
      if (onCreated) {
        await onCreated(values);
      } else {
        await AdminApi.createAdmin(values);
      }
      setOpenCreate(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(values) {
    if (!editing?.id) return;
    setSubmitting(true);
    try {
      if (onUpdated) {
        await onUpdated(editing.id, values);
      } else {
        await AdminApi.updateAdmin(editing.id, values);
      }
      setOpenEdit(false);
      setEditing(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Header />

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="admins">
            <div className="p-4 flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="admins"><Users className="h-4 w-4 mr-2" />Administrateurs</TabsTrigger>
                <TabsTrigger value="promote"><UserPlus className="h-4 w-4 mr-2" />Promouvoir</TabsTrigger>
                <TabsTrigger value="create">Créer</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenCreate(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Nouvel admin
                </Button>
              </div>
            </div>
            <Separator />

            {/* TAB: Administrateurs */}
            <TabsContent value="admins" className="p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : admins.length === 0 ? (
                <Empty text="Aucun administrateur pour le moment." />
              ) : (
                <ul className="space-y-3">
                  {admins.map((u) => (
                    <li key={u.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{fmtName(u) || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => { setEditing(u); setOpenEdit(true); }}
                          >
                            <Pencil className="h-4 w-4" /> Modifier
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                              if (!confirm("Retirer le rôle administrateur ?")) return;
                              await onRevoke?.(u.id);
                            }}
                          >
                            <ShieldMinus className="h-4 w-4" /> Retirer
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {/* TAB: Promouvoir */}
            <TabsContent value="promote" className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (nom, email)…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : filteredCandidates.length === 0 ? (
                <Empty text="Aucun utilisateur à promouvoir." />
              ) : (
                <ul className="space-y-3">
                  {filteredCandidates.map((u) => (
                    <li key={u.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{fmtName(u) || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="shrink-0">
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                              await onAssign?.(u.id);
                            }}
                          >
                            <UserPlus className="h-4 w-4" /> Promouvoir
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {/* TAB: Créer */}
            <TabsContent value="create" className="p-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3">Créer un nouvel administrateur</h4>
                <AdminUpsert
                  mode="create"
                  submitting={submitting}
                  onSubmit={handleCreate}
                  onCancel={() => setOpenCreate(false)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog: Create */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogTrigger asChild>
          {/* Hidden; we open programmatically */}
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel administrateur</DialogTitle>
            <DialogDescription id="admin-create-desc">
      Renseignez les informations puis validez pour créer un compte administrateur.
    </DialogDescription>
          </DialogHeader>
          <AdminUpsert
            mode="create"
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit */}
      <Dialog open={openEdit} onOpenChange={(v) => { if (!v) setEditing(null); setOpenEdit(v); }}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l’administrateur</DialogTitle>
            <DialogDescription id="admin-edit-desc">
              Mettez à jour les informations puis validez.
            </DialogDescription>
          </DialogHeader>
          <AdminUpsert
            mode="edit"
            initial={editing}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => { setOpenEdit(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestion des administrateurs</h2>
      </div>
      <Separator className="mt-3" />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
