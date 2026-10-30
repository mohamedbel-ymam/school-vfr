import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherDegreesApi } from "../../../services/api/Teacher/TeacherGradesServices";
import { attendanceScanApi } from "../../../services/api/admin/AttendanceScanApi";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { FileText, Printer, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Notice: L'ancienne méthode de saisie unitaire d'appel a été obsolétée.
 * Le système utilise désormais le module d'émargement hebdomadaire scannable.
 */
export default function TeacherAttendanceDegrees() {
  const navigate = useNavigate();
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleOpenPdf = async (degreeId) => {
    setDownloadingId(degreeId);
    try {
      await attendanceScanApi.openWeeklyPdf({ degreeId });
      toast.success("Fiche d'émargement A4 générée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur lors de la génération de la fiche A4.");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await teacherDegreesApi.list();
        if (!mounted) return;
        setDegrees(res.data?.data ?? res.data ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            Émargement & Assiduité — Espace Enseignant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Les appels s'effectuent par feuille d'émargement hebdomadaire officielle.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-sm flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Nouveau flux d'émargement hebdomadaire :</p>
          <p className="text-xs opacity-90 leading-relaxed">
            Une fiche papier A4 est imprimée pour chaque classe par semaine. En cours, laissez la case
            vide pour les présences et cochez la case en cas d'absence. Les fiches sont scannées par
            l'administration pour validation instantanée par reconnaissance optique (OMR).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {degrees.map((d) => {
            const pdfUrl = attendanceScanApi.getPdfDownloadUrl({
              degreeId: d.id,
              download: false,
            });

            return (
              <Card key={d.id} className="rounded-2xl hover:shadow-md transition border">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="text-lg font-bold text-foreground">{d.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Fiche d'émargement semaine en cours
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    disabled={downloadingId === d.id}
                    onClick={() => handleOpenPdf(d.id)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold border shadow-xs"
                  >
                    {downloadingId === d.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Printer className="w-3.5 h-3.5 text-primary" />
                        Télécharger la Fiche A4
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
