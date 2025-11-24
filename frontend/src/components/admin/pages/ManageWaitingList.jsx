import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { axiosClient } from "../../../api/axios";
import { Loader2 } from "lucide-react";

export default function ManageWaitingList() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier Excel.");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Importer la Liste d'Attente
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-muted-foreground"
          />

          <Button
            onClick={handleUpload}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importation...
              </span>
            ) : (
              "Importer le fichier Excel"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
