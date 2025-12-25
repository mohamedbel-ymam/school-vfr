import React, { useEffect, useState, useCallback } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

import BoursierUpsertForm from "../forms/BoursierUpsertForm";
import {
  fetchBoursiers,
  createBoursier,
  updateBoursier,
  deleteBoursier,
} from "../../../services/api/admin/BoursierApi";

/**
 * Admin page: ManageBoursier
 * - Liste des boursiers
 * - Création / édition
 * - Suppression
 */
export default function ManageBoursier() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const notify = (msg) => alert(msg);

  /* ---------------- Load list ---------------- */
  const loadBoursiers = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const res = await fetchBoursiers({
          q: search || "",
          page: params.page || 1,
        });

        setItems(res.data || []);
        setMeta({
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        });
      } catch (e) {
        console.error(e);
        notify("Erreur lors du chargement des boursiers");
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    loadBoursiers();
  }, [loadBoursiers]);

  /* ---------------- Actions ---------------- */
  const handleCreateClick = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEditClick = (row) => {
    setEditTarget({
      id: row.id,
      initialData: {
        firstName: row.user?.firstname ?? "",
        lastName: row.user?.lastname ?? "",
        email: row.user?.email ?? "",
        phone: row.user?.phone ?? "",
        finalSchoolYear: row.final_school_year ?? "",
        password: "",
      },
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (row) => {
    const fullName = row.user
      ? `${row.user.firstname} ${row.user.lastname}`
      : "ce boursier";

    if (!window.confirm(`Supprimer ${fullName} ?`)) return;

    setSubmitting(true);
    try {
      await deleteBoursier(row.id);
      notify("Boursier supprimé");
      loadBoursiers();
    } catch (e) {
      console.error(e);
      notify("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Submit form ---------------- */
  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editTarget) {
        // UPDATE
        await updateBoursier(editTarget.id, {
          firstname: payload.firstName,
          lastname: payload.lastName,
          email: payload.email,
          phone: payload.phone,
          final_school_year: payload.finalSchoolYear,
        });
        notify("Boursier mis à jour");
      } else {
        // CREATE
        await createBoursier({
          first_name: payload.firstName,
          last_name: payload.lastName,
          email: payload.email,
          password: payload.password,
          phone: payload.phone,
          final_school_year: payload.finalSchoolYear,
        });
        notify("Boursier créé");
      }

      setDialogOpen(false);
      setEditTarget(null);
      loadBoursiers();
    } catch (e) {
      console.error(e);
      notify("Erreur lors de l’enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Gestion des boursiers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Anciens élèves ayant obtenu une bourse après leur scolarité.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              className="w-48"
              placeholder="Rechercher (nom / email)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadBoursiers()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={loadBoursiers}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau boursier
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Nom complet</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Téléphone</th>
                  <th className="px-3 py-2 text-left">
                    Année finale chez Takwa
                  </th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center">
                      Chargement…
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center">
                      Aucun boursier trouvé.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/40">
                      <td className="px-3 py-2">
                        {row.user
                          ? `${row.user.firstname} ${row.user.lastname}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.user?.email ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.user?.phone ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.final_school_year ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEditClick(row)}
                            disabled={submitting}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteClick(row)}
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="mt-3 text-xs text-muted-foreground">
              Total : {meta.total} — Page {meta.current_page} / {meta.last_page}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Modifier un boursier" : "Ajouter un boursier"}
            </DialogTitle>
          </DialogHeader>

          <BoursierUpsertForm
            mode={editTarget ? "edit" : "create"}
            initialData={editTarget?.initialData}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditTarget(null);
            }}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
