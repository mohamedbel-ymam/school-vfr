import React, { useEffect, useMemo, useState } from "react";
import { teacherDegreesApi, teacherGradesLeaderboardApi } from "../../../services/api/Teacher/TeacherGradesServices";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Search, ArrowLeft, GraduationCap } from "lucide-react";

import TeacherGradesStudentGrid from "./TeacherGradesStudentGrid";

/* ----------------------------- helpers ----------------------------- */
const asList = (res) => res?.data?.data ?? res?.data ?? [];
const norm = (s) => String(s ?? "").toLowerCase().trim();

function DegreeTile({ degree, onOpen }) {
  const disabled = !!degree?.disabled;
  return (
    <Card
      className={[
        "rounded-2xl transition",
        disabled ? "opacity-50" : "cursor-pointer hover:shadow-sm",
      ].join(" ")}
      onClick={() => !disabled && onOpen?.(degree)}
      role={!disabled ? "button" : undefined}
      tabIndex={!disabled ? 0 : -1}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onOpen?.(degree);
      }}
    >
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">
              {degree?.name ?? `Degré #${degree?.id ?? "—"}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {disabled ? "Indisponible" : "Voir les élèves et saisir les notes"}
            </div>
          </div>

          <Badge variant="secondary" className="rounded-full">
            <GraduationCap className="h-3.5 w-3.5 mr-1" />
            Classe
          </Badge>
        </div>

        <Button disabled={disabled} variant="secondary" className="w-full rounded-xl">
          Ouvrir
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherGradesDashboard() {
  const [degrees, setDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  const [selectedDegree, setSelectedDegree] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ✅ search (teacher side)
  const [q, setQ] = useState("");

  /* ----------------------------- degrees ----------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingDegrees(true);
        const res = await teacherDegreesApi.list();
        if (!mounted) return;
        setDegrees(asList(res));
      } finally {
        if (mounted) setLoadingDegrees(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const tiles = useMemo(() => {
    const real = (degrees || []).slice(0, 8);
    const fillersCount = Math.max(0, 8 - real.length);
    const fillers = Array.from({ length: fillersCount }).map((_, i) => ({
      id: `soon-${i}`,
      name: "Bientôt",
      disabled: true,
    }));
    return [...real, ...fillers];
  }, [degrees]);

  /* ----------------------------- students ---------------------------- */
  const openDegree = async (degree) => {
    setSelectedDegree(degree);
    setQ(""); // reset search when switching degree
    setLoadingStudents(true);

    try {
      const res = await teacherGradesLeaderboardApi.byDegree(degree.id, { limit: 300 });
      setStudents(asList(res));
    } catch (e) {
      console.error(e);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = norm(q);
    if (!query) return students || [];

    return (students || []).filter((s) => {
      // IMPORTANT: search by name (not email)
      const name =
        s?.name ??
        [s?.firstname, s?.lastname].filter(Boolean).join(" ").trim() ??
        "";
      return norm(name).includes(query);
    });
  }, [students, q]);

  /* ------------------------------ UI -------------------------------- */
  return (
    <div className="p-4 space-y-6">
      {!selectedDegree ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold">Notes</h1>
              <p className="text-sm text-muted-foreground">
                Choisissez un niveau pour afficher les élèves et gérer les notes.
              </p>
            </div>
            <Badge className="rounded-full" variant="secondary">
              Enseignant
            </Badge>
          </div>

          {/* Degrees */}
          {loadingDegrees ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-3" />
                    <Skeleton className="h-9 w-full mt-4 rounded-xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiles.map((d) => (
                <DegreeTile key={d.id} degree={d} onOpen={openDegree} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Degree header */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Niveau</div>
                  <h2 className="text-xl font-semibold truncate">{selectedDegree.name}</h2>
                  <div className="text-xs text-muted-foreground mt-1">
                    {loadingStudents ? "Chargement…" : `${filteredStudents.length} élève(s)`}
                    {q ? ` • filtre: “${q}”` : ""}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setSelectedDegree(null);
                    setStudents([]);
                    setQ("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              {/* Search by NAME */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher un élève par nom/prénom…"
                    className="pl-9 rounded-xl"
                  />
                </div>

                {!!q && (
                  <Button variant="secondary" className="rounded-xl" onClick={() => setQ("")}>
                    Effacer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid */}
          <TeacherGradesStudentGrid students={filteredStudents} loading={loadingStudents} />
        </div>
      )}
    </div>
  );
}
