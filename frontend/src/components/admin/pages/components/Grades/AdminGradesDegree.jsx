import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { axiosClient } from "../../../../../api/axios";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Separator } from "../../../../../components/ui/separator";
import { toast } from "sonner";
import { GraduationCap, ArrowLeft, Search, ChevronRight } from "lucide-react";

const unwrapDegrees = (res) => res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? [];
const safeStr = (v) => (v == null ? "" : String(v));

export default function AdminGradesDegrees() {
  const nav = useNavigate();
  const loc = useLocation();

  const mode = useMemo(
    () => (loc.pathname.includes("/resultats") ? "resultats" : "attribution"),
    [loc.pathname]
  );

  const title =
    mode === "resultats"
      ? "Résultats — Choisir une classe"
      : "Attribution — Choisir une classe";

  const subtitle =
    mode === "resultats"
      ? "Sélectionnez une classe pour consulter les résultats."
      : "Sélectionnez une classe pour attribuer / modifier les notes.";

  const [loading, setLoading] = useState(true);
  const [degrees, setDegrees] = useState([]);
  const [q, setQ] = useState("");

  const fetchDegrees = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 10000 } });
      setDegrees(unwrapDegrees(res));
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger la liste des classes.");
      setDegrees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchDegrees();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return degrees;

    return degrees.filter((d) => {
      const name = safeStr(d?.name).toLowerCase();
      const id = safeStr(d?.id).toLowerCase();
      return name.includes(s) || id.includes(s);
    });
  }, [degrees, q]);

  const go = (degreeId) => {
    const id = Number(degreeId);
    if (!Number.isFinite(id)) return;

    if (mode === "resultats") nav(`/admin/notes/resultats/${id}`);
    else nav(`/admin/notes/attribution/${id}`);
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
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold leading-tight">{title}</h1>
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => nav(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button variant="secondary" onClick={fetchDegrees} disabled={loading}>
                Rafraîchir
              </Button>
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
                placeholder="Rechercher une classe… (nom ou ID)"
                className="pl-9 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} classe(s)`}
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">
              Aucune classe ne correspond à votre recherche.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => go(d.id)}
              className="text-left"
              aria-label={`Ouvrir ${d.name ?? `Degré #${d.id}`}`}
            >
              <Card className="rounded-2xl hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {d.name ?? `Degré #${d.id}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {d.id}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
