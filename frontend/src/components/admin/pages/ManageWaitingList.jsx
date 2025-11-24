import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { axiosClient } from "../../../api/axios";
import { Loader2, Trash2 } from "lucide-react";

export default function ManageWaitingList() {
  const [file, setFile] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  /* -------------------------------- Upload Excel -------------------------------- */
  const handleUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier Excel.");
      return;
    }

    setLoadingUpload(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axiosClient.post("/admin/waiting-list/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Liste d'attente importée avec succès !");
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation du fichier.");
    } finally {
      setLoadingUpload(false);
    }
  };

  /* -------------------------------- Delete List -------------------------------- */
  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer toute la liste d'attente ?")) {
      return;
    }

    setLoadingDelete(true);

    try {
      await axiosClient.delete("/admin/waiting-list/clear");
      toast.success("Liste d’attente supprimée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Gestion de la Liste d'Attente
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Upload Excel */}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-muted-foreground"
          />

          <Button
            onClick={handleUpload}
            disabled={loadingUpload}
            className="w-full"
          >
            {loadingUpload ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importation...
              </span>
            ) : (
              "Importer le fichier Excel"
            )}
          </Button>

          {/* Delete Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={loadingDelete}
          >
            {loadingDelete ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Supprimer toute la liste
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
