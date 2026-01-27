import React, { useEffect, useMemo, useState } from "react";
import { adminDegreesApi, adminRatingsLeaderboardApi } from "../../../services/api/admin/AdminRatingsServices";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import AdminDisciplineStudentGrid from "./components/AdminDisciplineStudentGrid";

export default function AdminDisciplineDashboard() {
  const [degrees, setDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  const [selectedDegree, setSelectedDegree] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // filters
  const [term] = useState("S1");
  const [period] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDegrees(true);
        const res = await adminDegreesApi.list();
        if (!mounted) return;
        setDegrees(res.data?.data ?? res.data ?? []);
      } finally {
        if (mounted) setLoadingDegrees(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const tiles = useMemo(() => {
    const real = degrees.slice(0, 8);
    const fillersCount = Math.max(0, 8 - real.length);
    const fillers = Array.from({ length: fillersCount }).map((_, i) => ({
      id: `soon-${i}`,
      name: "Bientôt",
      disabled: true,
    }));
    return [...real, ...fillers];
  }, [degrees]);

  const openDegree = async (degree) => {
    setSelectedDegree(degree);
    setLoadingStudents(true);
    try {
      const res = await adminRatingsLeaderboardApi.byDegree(degree.id, { limit: 150, term, period });
      setStudents(res.data?.data ?? []);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {!selectedDegree ? (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Discipline ⭐</h1>
            <div className="text-sm text-muted-foreground">Choisissez un niveau</div>
          </div>

          {loadingDegrees ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiles.map((d) => (
                <Card
                  key={d.id}
                  className={`rounded-2xl transition ${
                    d.disabled ? "opacity-50" : "cursor-pointer hover:shadow-md"
                  }`}
                  onClick={() => !d.disabled && openDegree(d)}
                >
                  <CardContent className="p-6 space-y-3">
                    <div className="text-lg font-semibold">{d.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.disabled ? "Indisponible" : "Voir les élèves"}
                    </div>
                    <Button disabled={d.disabled} variant="secondary">
                      Ouvrir
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm text-muted-foreground">Niveau</div>
              <h2 className="text-xl font-semibold">{selectedDegree.name}</h2>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedDegree(null);
                setStudents([]);
              }}
            >
              Retour
            </Button>
          </div>

          <AdminDisciplineStudentGrid students={students} loading={loadingStudents} term={term} period={period} />
        </div>
      )}
    </div>
  );
}
