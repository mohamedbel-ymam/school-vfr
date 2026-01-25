import React, { useEffect, useMemo, useState } from "react";
import { adminDegreesApi, adminLeaderboardApi } from "../../../services/api/admin/AdminGradesServices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import StudentLeaderboard from "./StudentLeaderboard";

export default function AdminGradesDashboard() {
  const [degrees, setDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  const [selectedDegree, setSelectedDegree] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

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
      name: "Soon",
      disabled: true,
    }));
    return [...real, ...fillers];
  }, [degrees]);

  const openDegree = async (degree) => {
    setSelectedDegree(degree);
    setLoadingBoard(true);
    try {
      const res = await adminLeaderboardApi.byDegree(degree.id, { limit: 120 });
      setLeaderboard(res.data?.data ?? []);
    } finally {
      setLoadingBoard(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {!selectedDegree ? (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Grades</h1>
            <div className="text-sm text-muted-foreground">
              Choose a degree to view students ranking
            </div>
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
                      {d.disabled ? "Coming soon" : "Open leaderboard"}
                    </div>
                    <div>
                      <Button disabled={d.disabled} variant="secondary">
                        Open
                      </Button>
                    </div>
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
              <div className="text-sm text-muted-foreground">Degree</div>
              <h2 className="text-xl font-semibold">{selectedDegree.name}</h2>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedDegree(null);
                setLeaderboard([]);
              }}
            >
              Back
            </Button>
          </div>

          <StudentLeaderboard students={leaderboard} loading={loadingBoard} />
        </div>
      )}
    </div>
  );
}
