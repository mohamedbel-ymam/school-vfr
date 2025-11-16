import React, { useEffect, useState, useCallback } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
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
 * - Création / édition via BoursierUpsertForm
 * - Suppression
 */
export default function ManageBoursier() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null); // pagination etc. si tu veux
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // boursier en édition ou null (création)

  const notify = (msg) => {
    // Remplace par ton système de toast si tu en as un
    // ex: toast({ title: msg })
    // eslint-disable-next-line no-alert
    alert(msg);
  };

  const loadBoursiers = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const data = await fetchBoursiers({
          q: search || "",
          page: params.page || 1,
        });
        // data: Laravel pagination { data, current_page, ... }
        setItems(data.data || []);
        setMeta({
          current_page: data.current_page,
          last_page: data.last_page,
          total: data.total,
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

  const handleCreateClick = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEditClick = (row) => {
    // Mapper les données backend -> initialData du formulaire
    const fullName = row.user?.name || "";
    const [firstName = "", lastName = ""] = fullName.split(" ", 2);

    const initialData = {
      firstName,
      lastName,
      dateOfBirth: row.date_of_birth || "",
      gender: row.gender || "male",
      finalSchoolYear: row.final_school_year || "",
      phone: row.phone || "",
      email: row.user?.email || "",
      password: "", // en édition: laisser vide pour ne pas changer
    };

    setEditTarget({
      id: row.id,
      userId: row.user_id,
      initialData,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (row) => {
    if (!window.confirm(`Supprimer le boursier ${row.user?.name} ?`)) return;
    setSubmitting(true);
    try {
      await deleteBoursier(row.id);
      notify("Boursier supprimé");
      await loadBoursiers();
    } catch (e) {
      console.error(e);
      notify("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editTarget) {
        // MODE EDIT
        await updateBoursier(editTarget.id, {
          name: payload.fullName,
          email: payload.email,
          // A adapter selon ton backend (ajoute les champs dans la migration + Request) :
          // phone: payload.phone,
          // gender: payload.gender,
          // date_of_birth: payload.dateOfBirth,
          // final_school_year: payload.finalSchoolYear,
        });
        notify("Boursier mis à jour");
      } else {
        // MODE CREATE
        await createBoursier({
            first_name: payload.firstName,
            last_name: payload.lastName,
            name: payload.fullName,        // optional, backend recomputes, but ok
            email: payload.email,
            password: payload.password,
          // idem: tu peux enrichir :
          // phone: payload.phone,
          // gender: payload.gender,
          // date_of_birth: payload.dateOfBirth,
          // final_school_year: payload.finalSchoolYear,
          // et éventuellement envoyer postSchoolYears / scholarshipSlices
        });
        notify("Boursier créé");
      }
      setDialogOpen(false);
      setEditTarget(null);
      await loadBoursiers();
    } catch (e) {
      console.error(e);
      notify("Erreur lors de l’enregistrement du boursier");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Gestion des boursiers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajouter, modifier ou supprimer les anciens élèves boursiers.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              className="w-48"
              placeholder="Rechercher (nom / email)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadBoursiers();
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadBoursiers()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
                  <th className="px-3 py-2 text-left font-medium">Nom complet</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Téléphone</th>
                  <th className="px-3 py-2 text-left font-medium">Année finale lycée</th>
                  <th className="px-3 py-2 text-left font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      Chargement…
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      Aucun boursier trouvé.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-muted/40"
                    >
                      <td className="px-3 py-2">
                        {row.user?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.user?.email ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.phone ?? "—"}
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
              Total: {meta.total} — Page {meta.current_page} / {meta.last_page}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: create / edit */}
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
