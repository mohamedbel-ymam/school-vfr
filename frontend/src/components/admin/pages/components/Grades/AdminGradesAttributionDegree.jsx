import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../../../api/axios";

import { Card, CardContent } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { Button } from "../../../../../components/ui/button";

// ✅ adapte le chemin exact chez toi
import StudentGradesDialog from "./StudentGradesDialog.jsx";

function toAvg20(totalScore, totalMax) {
  const s = Number(totalScore);
  const m = Number(totalMax);
  if (!m || m <= 0) return null;
  return (s / m) * 20;
}

export default function AdminGradesAttributionDegree() {
  const { degreeId } = useParams();

  const [term, setTerm] = useState("S1");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await axiosClient.get(`/admin/degrees/${degreeId}/grades-leaderboard`, {
          params: { limit: 150, term },
        });

        const rows = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;

        setStudents(rows);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => (mounted = false);
  }, [degreeId, term]);

  const cards = useMemo(() => {
    return (students || []).map((s) => {
      const avg20 = toAvg20(s.total_score, s.total_max);
      return {
        ...s,
        avg20,
        displayName: s.name ?? `#${s.id}`,
      };
    });
  }, [students]);

  const onClickStudent = (s) => {
    setSelectedStudent(s);
    setOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Attribution — Élèves du degré #{degreeId}</h1>
          <p className="text-sm text-muted-foreground">
            Cliquez sur un élève pour gérer ses notes.
          </p>
        </div>

        <div className="w-[160px]">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S1">S1</SelectItem>
              <SelectItem value="S2">S2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucun élève trouvé.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map((s) => (
            <Card
              key={s.id}
              className="rounded-2xl cursor-pointer hover:shadow-sm transition"
              onClick={() => onClickStudent(s)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold line-clamp-1">{s.displayName}</div>

                <div className="text-xs text-muted-foreground">
                  Notes: <span className="font-medium text-foreground">{s.grades_count ?? 0}</span>
                </div>

                <div className="text-sm">
                  Moyenne:{" "}
                  <span className="font-semibold">
                    {s.avg20 == null ? "—" : `${s.avg20.toFixed(2)} / 20`}
                  </span>
                </div>

                <Button className="w-full" variant="secondary">
                  Gérer les notes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog CRUD (déjà fait) */}
      {selectedStudent && (
        <StudentGradesDialog
          student={selectedStudent}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  );
}
