import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  ArrowLeft,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Save,
  Filter,
  Check,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { attendanceScanApi } from "../../../services/api/admin/AttendanceScanApi";
import { adminDegreesApi } from "../../../services/api/admin/AdminGradesServices";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";

export default function AttendanceScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-selected parameters from URL if any
  const initialDegreeId = searchParams.get("degree_id") || "";
  const initialWeek = searchParams.get("week") || "";
  const initialYear = searchParams.get("year") || String(new Date().getFullYear());

  // Classes / Degrees list
  const [degrees, setDegrees] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState(initialDegreeId);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek || String(getIsoWeek(new Date())));
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Upload & Drag-Drop State
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  // Scan Results State
  const [scanResult, setScanResult] = useState(null);
  // Matrix edit state: map[student_id][session_id] = "present" | "absent" | "retard"
  const [editedMatrix, setEditedMatrix] = useState({});
  const [saving, setSaving] = useState(false);

  // UI view options
  const [zoom, setZoom] = useState(1);
  const [showOverlays, setShowOverlays] = useState(true);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "absent_only"

  const fileInputRef = useRef(null);

  // Helper: get ISO week number
  function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  // Load degrees list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await adminDegreesApi.list();
        if (!mounted) return;
        const list = res.data?.data ?? res.data ?? [];
        setDegrees(list);
        if (!selectedDegree && list.length > 0) {
          setSelectedDegree(String(list[0].id));
        }
      } catch (err) {
        console.error("Failed to load degrees", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selected) => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      toast.error("Format de fichier non supporté. Veuillez choisir une image (JPG, PNG) ou un PDF.");
      return;
    }
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  // Launch Scan Analysis
  const handleStartAnalysis = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner ou déposer une fiche scannée.");
      return;
    }

    setAnalyzing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("scan_file", file);
    if (selectedDegree) formData.append("degree_id", selectedDegree);
    if (selectedWeek) formData.append("week_number", selectedWeek);
    if (selectedYear) formData.append("year", selectedYear);

    try {
      const res = await attendanceScanApi.uploadScan(formData, (percent) => {
        setUploadProgress(percent);
      });

      const data = res.data?.data;
      if (!data) {
        throw new Error(res.data?.message || "Erreur de traitement");
      }

      setScanResult(data);

      // Initialize edited matrix from backend detections
      const initialMap = {};
      if (data.students && data.sessions) {
        data.students.forEach((student) => {
          initialMap[student.id] = {};
          data.sessions.forEach((session) => {
            const detected = data.matrix?.[student.id]?.[session.id];
            initialMap[student.id][session.id] = detected?.status || "present";
          });
        });
      }
      setEditedMatrix(initialMap);
      toast.success("Feuille scannée et analysée avec succès !");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Erreur lors de l'analyse du document.";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle status for a specific cell: Present -> Absent -> Retard -> Present
  const toggleCellStatus = (studentId, sessionId) => {
    setEditedMatrix((prev) => {
      const current = prev[studentId]?.[sessionId] || "present";
      const next = current === "present" ? "absent" : current === "absent" ? "retard" : "present";
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [sessionId]: next,
        },
      };
    });
  };

  // Set specific status directly
  const setCellStatus = (studentId, sessionId, status) => {
    setEditedMatrix((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [sessionId]: status,
      },
    }));
  };

  // Mark all students present
  const handleMarkAllPresent = () => {
    if (!scanResult) return;
    setEditedMatrix((prev) => {
      const updated = { ...prev };
      scanResult.students.forEach((s) => {
        updated[s.id] = updated[s.id] || {};
        scanResult.sessions.forEach((sess) => {
          updated[s.id][sess.id] = "present";
        });
      });
      return updated;
    });
    toast.info("Tous les étudiants ont été marqués comme Présents.");
  };

  // Calculate live statistics from editedMatrix
  const stats = useMemo(() => {
    let presents = 0;
    let absents = 0;
    let retards = 0;
    let total = 0;

    Object.values(editedMatrix).forEach((studentRow) => {
      Object.values(studentRow).forEach((status) => {
        total++;
        if (status === "present") presents++;
        else if (status === "absent") absents++;
        else if (status === "retard") retards++;
      });
    });

    return { presents, absents, retards, total };
  }, [editedMatrix]);

  // Submit and confirm attendance
  const handleConfirmAndSave = async () => {
    if (!scanResult || saving) return;

    setSaving(true);
    const records = [];

    Object.entries(editedMatrix).forEach(([studentId, sessionMap]) => {
      Object.entries(sessionMap).forEach(([sessionId, status]) => {
        records.push({
          student_id: Number(studentId),
          session_id: Number(sessionId),
          status,
        });
      });
    });

    try {
      const res = await attendanceScanApi.confirmScan(records);
      toast.success(res.data?.message || "Émargement validé et enregistré !");
      // Redirect back to class attendance overview or reload
      setTimeout(() => {
        navigate(`/admin/presences/${scanResult.degree?.id || selectedDegree}`);
      }, 1200);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'émargement.");
    } finally {
      setSaving(false);
    }
  };

  // Filter students based on filterMode
  const displayedStudents = useMemo(() => {
    if (!scanResult?.students) return [];
    if (filterMode === "all") return scanResult.students;

    return scanResult.students.filter((student) => {
      const studentSessions = editedMatrix[student.id] || {};
      return Object.values(studentSessions).some((st) => st === "absent" || st === "retard");
    });
  }, [scanResult, filterMode, editedMatrix]);

  const [printingPdf, setPrintingPdf] = useState(false);

  const handlePrintPdf = async () => {
    if (!selectedDegree) {
      toast.error("Veuillez sélectionner une classe.");
      return;
    }
    setPrintingPdf(true);
    try {
      await attendanceScanApi.openWeeklyPdf({
        degreeId: Number(selectedDegree),
        weekNumber: selectedWeek,
        year: selectedYear,
      });
      toast.success("Fiche d'émargement A4 générée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de la génération de la fiche A4."
      );
    } finally {
      setPrintingPdf(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-6 h-6" />
              </span>
              Module d'Émargement Papier & Scanner OMR
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Générez la fiche hebdomadaire A4, ou scannez la feuille papier complétée pour détecter instantanément les absences.
            </p>
          </div>
        </div>

        {/* Action: Print sheet directly */}
        <Button
          variant="secondary"
          disabled={!selectedDegree || printingPdf}
          onClick={handlePrintPdf}
          className="rounded-xl flex items-center gap-2 text-sm font-medium border shadow-xs"
        >
          {printingPdf ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Génération du PDF...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 text-primary" />
              Imprimer la Fiche Vierge (A4)
            </>
          )}
        </Button>
      </div>

      {/* Screen 1: Document Upload & Parameters (Visible if no scan result yet) */}
      {!scanResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Configuration */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Paramètres de la Semaine</CardTitle>
              <CardDescription>
                Identifiez la classe et la période de la fiche à traiter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Classe */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Classe / Niveau
                </label>
                <select
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {degrees.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semaine & Année */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Semaine N°
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="53"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Année
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="p-4 rounded-xl bg-muted/40 border text-xs space-y-2 mt-6">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Guide d'utilisation :
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  1. Imprimez la fiche hebdomadaire au format <strong>A4 Paysage</strong>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  2. L'enseignant laisse la case <strong>vide</strong> si l'élève est présent, ou coche (croix <strong>X</strong>) s'il est absent.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  3. Déposez la photo ou le scan ci-contre pour lecture automatique.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Drag and Drop Upload Area */}
          <Card className="lg:col-span-2 rounded-2xl border shadow-sm flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg">Téléversement du Scan Papier</CardTitle>
              <CardDescription>
                Glissez la photo prise avec smartphone (JPG/PNG) ou le scan numérisé (PDF)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-3">
                    {filePreview ? (
                      <div className="relative inline-block max-h-56 overflow-hidden rounded-xl shadow-md border">
                        <img
                          src={filePreview}
                          alt="Aperçu du scan"
                          className="max-h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} Mo • Cliquez pour remplacer
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Glissez-déposez la feuille ici, ou{" "}
                        <span className="text-primary underline">parcourez vos fichiers</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formats supportés : JPG, PNG, WEBP, PDF (max. 20 Mo)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading Indicator */}
              {analyzing && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyse optique de la grille (OMR) en cours...
                    </span>
                    <span>{uploadProgress > 0 ? `${uploadProgress}%` : "Traitement..."}</span>
                  </div>
                  <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(15, uploadProgress)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Alignement sur les ancres visuelles et calcul de l'assiduité étudiant par séance...
                  </p>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  disabled={!file || analyzing}
                  onClick={handleStartAnalysis}
                  className="rounded-xl px-6 py-2.5 font-semibold shadow-sm flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lancer l'Analyse du Scan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Screen 2: Split-Screen Verification & Confirmation View */}
      {scanResult && (
        <div className="space-y-4">
          {/* Top Banner Stats & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Classe & Semaine</span>
                <span className="text-base font-bold text-foreground">
                  {scanResult.degree?.name} — Semaine {scanResult.weekNumber} ({scanResult.year})
                </span>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              {/* Badges */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stats.presents} Présents
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 border border-rose-500/20">
                  <XCircle className="w-3.5 h-3.5" />
                  {stats.absents} Absents détectés
                </span>
                {stats.retards > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    {stats.retards} Retards
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanResult(null);
                  setFile(null);
                  setFilePreview(null);
                }}
                className="rounded-xl text-xs"
              >
                Nouveau Scan
              </Button>
              <Button
                disabled={saving}
                onClick={handleConfirmAndSave}
                className="rounded-xl px-5 py-2 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Valider & Enregistrer l'Émargement
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Split Screen Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
            {/* Left Side: Uploaded Scan Preview with Zoom & Controls (5 Cols) */}
            <Card className="lg:col-span-5 rounded-2xl border shadow-sm flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Document Scanné Original
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-muted-foreground px-1">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowOverlays(!showOverlays)}
                    className={`p-1.5 rounded-lg border text-xs ml-1 ${
                      showOverlays ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                    }`}
                    title="Afficher/masquer les repères détectés"
                  >
                    {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-2 flex-1 overflow-auto bg-slate-900/5 relative flex items-center justify-center min-h-[480px]">
                {scanResult.image_url ? (
                  <div
                    className="relative transition-transform duration-150 origin-top"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    <img
                      src={scanResult.image_url}
                      alt="Scan analysé"
                      className="max-w-full rounded shadow border bg-white"
                    />

                    {/* Optional OMR Overlays */}
                    {showOverlays &&
                      scanResult.detections?.map((d, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            left: `${d.box.x}%`,
                            top: `${d.box.y}%`,
                            width: `${d.box.w}%`,
                            height: `${d.box.h}%`,
                          }}
                          className={`border rounded-xs pointer-events-none transition-all ${
                            d.is_marked
                              ? "border-rose-500 bg-rose-500/25 ring-2 ring-rose-400"
                              : "border-emerald-400/50 bg-emerald-400/10"
                          }`}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aperçu direct indisponible pour ce format de scan.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Side: Verification Table & 1-Click Status Rectification (7 Cols) */}
            <Card className="lg:col-span-7 rounded-2xl border shadow-sm flex flex-col overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Grille de Validation des Présences
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur une case pour basculer en 1 clic entre Présent, Absent et Retard.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter: All vs Absents only */}
                  <div className="flex items-center rounded-xl bg-muted p-0.5 text-xs">
                    <button
                      onClick={() => setFilterMode("all")}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        filterMode === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      Tous ({scanResult.students?.length})
                    </button>
                    <button
                      onClick={() => setFilterMode("absent_only")}
                      className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                        filterMode === "absent_only"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Absents uniquement
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    className="text-xs h-7 rounded-lg"
                  >
                    Tout présent
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/40 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground w-10 text-center">N°</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground min-w-[140px]">
                        Étudiant
                      </th>
                      {scanResult.sessions?.map((sess) => (
                        <th
                          key={sess.id}
                          className="py-2 px-2 font-semibold text-center border-l min-w-[90px]"
                        >
                          <div className="font-bold text-foreground truncate">{sess.subject_name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {sess.date}
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {sess.start_time} - {sess.end_time}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedStudents.map((student, idx) => {
                      const hasAbsence = Object.values(editedMatrix[student.id] || {}).some(
                        (st) => st === "absent" || st === "retard"
                      );

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            hasAbsence ? "bg-rose-500/[0.03]" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-muted-foreground font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-foreground uppercase tracking-wide">
                              {student.full_name}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {student.matricule}
                            </div>
                          </td>

                          {scanResult.sessions?.map((sess) => {
                            const status = editedMatrix[student.id]?.[sess.id] || "present";
                            const detection = scanResult.matrix?.[student.id]?.[sess.id];
                            const isAutoDetectedAbsent = detection?.is_marked;

                            return (
                              <td
                                key={sess.id}
                                className="py-2 px-2 text-center border-l align-middle"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleCellStatus(student.id, sess.id)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs border ${
                                    status === "present"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                      : status === "absent"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 ring-1 ring-rose-400/50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                  }`}
                                  title="Cliquez pour changer le statut"
                                >
                                  {status === "present" && (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span>Présent</span>
                                    </>
                                  )}
                                  {status === "absent" && (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                      <span>Absent</span>
                                    </>
                                  )}
                                  {status === "retard" && (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                      <span>Retard</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {displayedStudents.length === 0 && (
                      <tr>
                        <td
                          colSpan={(scanResult.sessions?.length || 0) + 2}
                          className="py-12 text-center text-muted-foreground"
                        >
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                          Aucune absence détectée avec le filtre actuel.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
