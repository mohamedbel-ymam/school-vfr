import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherDegreesApi } from "../../../services/api/Teacher/TeacherGradesServices";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";

export default function TeacherAttendanceDegrees() {
  const navigate = useNavigate();
  const [degrees, setDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDegrees(true);
        const res = await teacherDegreesApi.list();
        if (!mounted) return;
        setDegrees(res.data?.data ?? res.data ?? []);
      } finally {
        if (mounted) setLoadingDegrees(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const tiles = useMemo(() => {
    const real = degrees.slice(0, 6); // you said 6 degrees
    const fillersCount = Math.max(0, 6 - real.length);
    const fillers = Array.from({ length: fillersCount }).map((_, i) => ({
      id: `soon-${i}`,
      name: "Bientôt",
      disabled: true,
    }));
    return [...real, ...fillers];
  }, [degrees]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Présence ✅</h1>
        <div className="text-sm text-muted-foreground">Choisissez une classe</div>
      </div>

      {loadingDegrees ? (
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
          {tiles.map((d) => (
            <Card
              key={d.id}
              className={`rounded-2xl transition ${
                d.disabled ? "opacity-50" : "cursor-pointer hover:shadow-md"
              }`}
              onClick={() => !d.disabled && navigate(`/enseignant/attendance/${d.id}`)}
            >
              <CardContent className="p-6 space-y-3">
                <div className="text-lg font-semibold">{d.name}</div>
                <div className="text-sm text-muted-foreground">
                  {d.disabled ? "Indisponible" : "Commencer l'appel"}
                </div>
                <Button disabled={d.disabled} variant="secondary">
                  Ouvrir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
