// src/components/events/EventsList.jsx
import { useEffect, useState, useMemo } from "react";
import { EventApi } from "../../services/api/EventApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { renderEventImage } from "../../services/media/EventImage";

// Optional: if you have shadcn Skeleton. If not, replace with a simple div shimmer.
import { Skeleton } from "../ui/skeleton";

// ----------------------- small helpers -----------------------
const TEMPLATE_STYLES = {
  GENERAL:      "bg-slate-900/70 text-white border-white/10",
  EXAM:         "bg-rose-600/80 text-white border-rose-400/30",
  MEETING:      "bg-amber-600/80 text-white border-amber-400/30",
  HOLIDAY:      "bg-emerald-600/80 text-white border-emerald-400/30",
  WORKSHOP:     "bg-indigo-600/80 text-white border-indigo-400/30",
  ANNOUNCEMENT: "bg-sky-600/80 text-white border-sky-400/30",
  EMERGENCY:    "bg-red-700/85 text-white border-red-400/30",
};

function TemplateBadge({ template }) {
  const key = String(template || "GENERAL").toUpperCase();
  const cls = TEMPLATE_STYLES[key] || TEMPLATE_STYLES.GENERAL;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cls}`}
    >
      {key}
    </span>
  );
}

function formatWhen(s) {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s ?? "";
  }
}

// ----------------------- skeleton grid -----------------------
function EventsSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="relative h-44">
            <Skeleton className="absolute inset-0 h-full w-full" />
          </div>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ----------------------- main -----------------------
export default function EventsList({ query = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genMap, setGenMap] = useState({}); // { [id]: dataURL }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await EventApi.list(query);
        const arr = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        if (!mounted) return;
        setItems(arr || []);
        // kick off preview generation lazily
        arr?.forEach(async (ev) => {
          if (ev.image_url) return;
          const dataURL = await renderEventImage(ev);
          if (!mounted) return;
          setGenMap((m) => (m[ev.id] ? m : { ...m, [ev.id]: dataURL }));
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [JSON.stringify(query)]);

  if (loading) return <EventsSkeleton count={6} />;

  if (!items.length) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 opacity-80" />
        <h3 className="text-lg font-semibold">Aucun événement pour le moment</h3>
        <p className="text-muted-foreground text-sm">
          Revenez bientôt — de nouvelles annonces apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 p-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((ev) => {
        const preview = ev.image_url || genMap[ev.id];

        return (
          <Card
            key={ev.id}
            className="group overflow-hidden border bg-card text-card-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            {/* Image header with overlay */}
            <div className="relative h-48 overflow-hidden">
              {preview ? (
                <img
                    src={preview}
                    alt={ev.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-emerald-500" />
              )}

              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* top row: template badge + date */}
              <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                <TemplateBadge template={ev.template} />
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {formatWhen(ev.starts_at)}
                </span>
              </div>

              {/* bottom: title */}
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="line-clamp-2 text-balance text-lg font-semibold text-white drop-shadow">
                  {ev.title}
                </h3>
              </div>
            </div>

            {/* body */}
            <CardContent className="p-4">
              <div className="space-y-3">
                {ev.location && (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground/5">
                      📍
                    </span>
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}

                {ev.description && (
                  <p className="line-clamp-4 text-sm leading-relaxed text-foreground/90">
                    {ev.description}
                  </p>
                )}

                {/* footer actions */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    ID&nbsp;#{ev.id}
                  </div>

                  {ev.data?.cta_url && (
                    <Button asChild size="sm" className="shadow-sm">
                      <a
                        href={ev.data.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        title={ev.data.cta_text || "Open link"}
                      >
                        {ev.data.cta_text || "Découvrir"}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
