import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosClient } from "../../../../../api/axios";

import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Separator } from "../../../../../components/ui/separator";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";

import StudentGradesDialog from "./StudentGradesDialog.jsx";

/* ----------------------------- helpers ----------------------------- */
function unwrap(res) {
  return res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
}

function toAvg20(totalScore, totalMax) {
  const s = Number(totalScore);
  const m = Number(totalMax);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 20;
}

function normName(s) {
  // ✅ search ONLY by student name (no email)
  const name =
    s?.name ??
    [s?.firstname, s?.lastname].filter(Boolean).join(" ").trim() ??
    "";
  return name.toLowerCase();
}

export default function AdminGradesAttributionDegree() {
  const { degreeId } = useParams();

  const [degreeName, setDegreeName] = useState("");
  const [term, setTerm] = useState("S1");

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const [q, setQ] = useState(""); // ✅ name search only
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [degRes, lbRes] = await Promise.all([
        axiosClient.get(`/admin/degrees/${degreeId}`),
        axiosClient.get(`/admin/degrees/${degreeId}/grades-leaderboard`, {
          params: { limit: 2000, term },
        }),
      ]);

      setDegreeName(
        degRes?.data?.data?.name ?? degRes?.data?.name ?? `Degré #${degreeId}`
      );

      const rows = unwrap(lbRes);
      setStudents(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les élèves / notes.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degreeId, term]);

  const cards = useMemo(() => {
    return (students || []).map((s) => {
      const avg20 = toAvg20(s.total_score, s.total_max);
      const displayName =
        s.name ??
        [s.firstname, s.lastname].filter(Boolean).join(" ").trim() ??
        `#${s.id}`;

      return {
        ...s,
        avg20,
        displayName,
        _nameSearch: normName(s),
      };
    });
  }, [students]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;

    // ✅ match by words: "anass sanhaji" works even if typed "anass" or "sanhaji"
    const parts = needle.split(/\s+/).filter(Boolean);
    return cards.filter((s) => parts.every((p) => s._nameSearch.includes(p)));
  }, [cards, q]);

  const onClickStudent = (s) => {
    setSelectedStudent(s);
    setOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-muted/60 grid place-items-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold leading-tight truncate">
                    Attribution — {degreeName || `Degré #${degreeId}`}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur un élève pour gérer ses notes.
                  </p>
                </div>
              </div>
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

          <Separator className="my-4" />

          {/* Search + count */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par nom/prénom…"
                className="pl-9 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} élève(s)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">
              Aucun élève ne correspond à votre recherche.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onClickStudent(s)}
              className="text-left"
              aria-label={`Gérer les notes de ${s.displayName}`}
            >
              <Card className="rounded-2xl hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="font-semibold line-clamp-1">{s.displayName}</div>

                  <div className="text-xs text-muted-foreground">
                    Notes:{" "}
                    <span className="font-medium text-foreground">
                      {s.grades_count ?? 0}
                    </span>
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
            </button>
          ))}
        </div>
      )}

      {/* Dialog CRUD */}
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
