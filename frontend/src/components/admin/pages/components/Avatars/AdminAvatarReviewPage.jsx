import React, { useEffect, useMemo, useState } from "react";
import { AdminAvatarReviewApi } from "../../../../../services/api/admin/AdminAvatarReviewApi";
import { axiosClient } from "../../../../../api/axios";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Input } from "../../../../../components/ui/input";
import { toast } from "sonner";

function fullName(u) {
  const f = u?.firstname ?? "";
  const l = u?.lastname ?? "";
  return `${f} ${l}`.trim() || `#${u?.id}`;
}

export default function AdminAvatarReviewPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [degreeMap, setDegreeMap] = useState(new Map());

  // pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(24);
  const [meta, setMeta] = useState(null);

  // simple filter
  const [q, setQ] = useState("");

  const loadDegrees = async () => {
    try {
      const res = await axiosClient.get("/admin/degrees", { params: { per_page: 1000 } });
      const list = res?.data?.data ?? res?.data ?? [];
      const m = new Map();
      (list || []).forEach((d) => m.set(String(d.id), d.name ?? `Degré #${d.id}`));
      setDegreeMap(m);
    } catch {
      setDegreeMap(new Map());
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await AdminAvatarReviewApi.pending({ page, per_page: perPage });
      let items = res?.data?.data ?? [];
      const m = res?.data?.meta ?? null;

      // optional client filter by name (simple)
      const term = q.trim().toLowerCase();
      if (term) {
        items = items.filter((u) => fullName(u).toLowerCase().includes(term));
      }

      setRows(items);
      setMeta(m);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les photos en attente.");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDegrees();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const lastPage = meta?.last_page ?? 1;

  const degreeName = (degreeId) => degreeMap.get(String(degreeId)) || (degreeId ? `Degré #${degreeId}` : "—");

  const onApprove = async (studentId) => {
    try {
      await AdminAvatarReviewApi.approve(studentId);
      toast.success("Photo approuvée ✅");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Impossible d’approuver cette photo.");
    }
  };

  const onReject = async (studentId) => {
    try {
      await AdminAvatarReviewApi.reject(studentId);
      toast.success("Photo refusée ❌");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Impossible de refuser cette photo.");
    }
  };

  const headerSubtitle = useMemo(() => {
    const total = meta?.total ?? null;
    if (total == null) return "Validez ou refusez les photos envoyées par les élèves.";
    return `Photos en attente : ${total}`;
  }, [meta]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Validation des photos</h1>
          <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
        </div>

        <div className="w-[240px]">
          <Input
            className="rounded-xl"
            placeholder="Rechercher un élève…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Photos en attente</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-2xl border p-3 space-y-3">
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">
              Aucune photo en attente pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {rows.map((u) => (
                <div key={u.id} className="rounded-2xl border p-3">
                  <div className="rounded-xl overflow-hidden border bg-slate-50 h-44 grid place-items-center">
                    {u.avatar_pending_url ? (
                      <img
                        src={u.avatar_pending_url}
                        alt="pending avatar"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">Aperçu indisponible</div>
                    )}
                  </div>

                  <div className="mt-3 min-w-0">
                    <div className="font-semibold truncate">{fullName(u)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {degreeName(u.degree_id)}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button className="w-full rounded-xl" onClick={() => onApprove(u.id)}>
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full rounded-xl"
                      onClick={() => onReject(u.id)}
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && meta?.last_page > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Page {meta.current_page} / {meta.last_page}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
