import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { axiosClient } from "../../../../../api/axios";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";

export default function AdminGradesDegrees() {
  const nav = useNavigate();
  const loc = useLocation();

  const mode = loc.pathname.includes("/resultats") ? "resultats" : "attribution";

  const [loading, setLoading] = useState(true);
  const [degrees, setDegrees] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get("/admin/degrees", { params: { per_page: 200 } });
        const items = res?.data?.data ?? res?.data?.data?.data ?? res?.data ?? [];
        if (!mounted) return;
        setDegrees(items);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const go = (degreeId) => {
    if (mode === "resultats") nav(`/admin/notes/resultats/${degreeId}`);
    else nav(`/admin/notes/attribution/${degreeId}`);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {mode === "resultats" ? "Résultats — Choisir un degré" : "Attribution — Choisir un degré"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cliquez sur un degré pour continuer.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {degrees.map((d) => (
            <Card
              key={d.id}
              className="rounded-2xl cursor-pointer hover:shadow-sm transition"
              onClick={() => go(d.id)}
            >
              <CardContent className="p-4">
                <div className="font-semibold">{d.name ?? `Degré #${d.id}`}</div>
                <div className="text-xs text-muted-foreground">
                  ID: {d.id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
