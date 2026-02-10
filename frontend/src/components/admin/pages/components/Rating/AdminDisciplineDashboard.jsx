import React, { useEffect, useMemo, useState } from "react";
import {
  adminDegreesApi,
  adminRatingsLeaderboardApi,
} from "../../../../../services/api/admin/AdminRatingsServices";

import { Card, CardContent } from "../../../../ui/card";
import { Button } from "../../../../ui/button";
import { Skeleton } from "../../../../ui/skeleton";
import { Input } from "../../../../ui/input";
import { Separator } from "../../../../ui/separator";

import { Search, Star, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import AdminDisciplineStudentGrid from "./AdminDisciplineStudentGrid";

/* ----------------------------- helpers ----------------------------- */
const unwrap = (res) => res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];

const norm = (s) => String(s ?? "").toLowerCase().trim();
const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

export default function AdminDisciplineDashboard() {
  const [degrees, setDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  const [selectedDegree, setSelectedDegree] = useState(null);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // filters (keep your defaults)
  const [term] = useState("S1");
  const [period] = useState(monthKey);

  // ✅ search
  const [q, setQ] = useState("");

  /* ------------------ load degrees ------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDegrees(true);
      try {
        const res = await adminDegreesApi.list();
        if (!alive) return;
        const list = unwrap(res);
        setDegrees(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        toast.error("Impossible de charger les degrés.");
        setDegrees([]);
      } finally {
        if (alive) setLoadingDegrees(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------ tiles (degrees) ------------------ */
  const tiles = useMemo(() => {
    // show real list (or keep top 8 + placeholders if you like)
    const real = degrees;
    return (real || []).map((d) => ({
      id: d.id,
      name: d.name ?? `Degré #${d.id}`,
      disabled: false,
      raw: d,
    }));
  }, [degrees]);

  /* ------------------ open degree => load students ------------------ */
  const openDegree = async (degree) => {
    setSelectedDegree(degree);
    setStudents([]);
    setQ("");
    setLoadingStudents(true);
    try {
      const res = await adminRatingsLeaderboardApi.byDegree(degree.id, {
        limit: 2000,
        term,
        period,
      });
      const list = unwrap(res);
      setStudents(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les élèves (discipline).");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const closeDegree = () => {
    setSelectedDegree(null);
    setStudents([]);
    setQ("");
  };

  /* ------------------ filter students by NAME only ------------------ */
  const filteredStudents = useMemo(() => {
    if (!selectedDegree) return [];
    const needle = norm(q);
    if (!needle) return students;

    // ✅ match by words: "anass sanhaji" works even if typed "anass" or "sanhaji"
    const parts = needle.split(/\s+/).filter(Boolean);
    return (students || []).filter((s) => {
      const displayName =
        s?.name ??
        [s?.firstname, s?.lastname].filter(Boolean).join(" ").trim() ??
        "";
      const hay = norm(displayName);
      return parts.every((p) => hay.includes(p));
    });
  }, [students, q, selectedDegree]);

  /* ----------------------------- UI ----------------------------- */
  return (
    <div className="p-4 space-y-4">
      {!selectedDegree ? (
        <>
          {/* Header */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 grid place-items-center">
                    <Star className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold truncate">Discipline ⭐</h1>
                    <p className="text-sm text-muted-foreground">
                      Choisissez un niveau pour afficher les élèves.
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {loadingDegrees ? "Chargement…" : `${tiles.length} niveaux`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Degrees grid */}
          {loadingDegrees ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-28 mt-3" />
                    <Skeleton className="h-9 w-full mt-4 rounded-xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tiles.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucun degré trouvé.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tiles.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => !d.disabled && openDegree(d.raw ?? d)}
                  className="text-left"
                >
                  <Card className="rounded-2xl hover:shadow-sm transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="font-semibold line-clamp-1">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Ouvrir la discipline
                      </div>
                      <Button variant="secondary" className="w-full">
                        Ouvrir
                      </Button>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Degree header + search */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Niveau</div>
                  <h2 className="text-xl font-semibold truncate">
                    {selectedDegree?.name ?? `Degré #${selectedDegree?.id}`}
                  </h2>
                  <div className="text-sm text-muted-foreground mt-1">
                    Période: {period} • Trimestre: {term}
                  </div>
                </div>

                <Button variant="outline" onClick={closeDegree}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher un élève par nom/prénom…"
                    className="pl-9 rounded-xl"
                    disabled={loadingStudents}
                  />
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {loadingStudents ? "Chargement…" : `${filteredStudents.length} élève(s)`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid (pass filtered list) */}
          <AdminDisciplineStudentGrid
            students={filteredStudents}
            loading={loadingStudents}
            term={term}
            period={period}
          />
        </>
      )}
    </div>
  );
}
