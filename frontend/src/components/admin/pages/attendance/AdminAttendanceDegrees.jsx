import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { toast } from "sonner";

// reuse your already-working degrees api (same as teacher discipline)
import { DegreeApi } from "../../../../services/api/admin/DegreeApi";

export default function AdminAttendanceDegrees() {
  const navigate = useNavigate();
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await DegreeApi.list();
        if (!mounted) return;
        setDegrees(res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Impossible de charger les classes.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const tiles = useMemo(() => {
    const real = degrees.slice(0, 7);
    const fillers = Array.from({ length: Math.max(0, 7 - real.length) }).map((_, i) => ({
      id: `soon-${i}`,
      name: "Bientôt",
      disabled: true,
    }));
    return [...real, ...fillers];
  }, [degrees]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Présences — Admin</h1>
        <div className="text-sm text-muted-foreground">Choisissez un niveau</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
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
              onClick={() =>
                !d.disabled &&
                navigate(`/admin/presences/${d.id}`, {
                  state: { degreeName: d.name },
                })
              }
            >
              <CardContent className="p-6 space-y-3">
                <div className="text-lg font-semibold">{d.name}</div>
                <div className="text-sm text-muted-foreground">
                  {d.disabled ? "Indisponible" : "Ajuster / Résultats"}
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
