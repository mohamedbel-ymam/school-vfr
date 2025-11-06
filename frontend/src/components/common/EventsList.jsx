// src/components/events/EventsList.jsx
import { useEffect, useState, useMemo } from "react";
import { EventApi } from "../../services/api/EventApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { renderEventImage } from "../../services/media/EventImage";

export default function EventsList({ query = {} }) {
  const [items, setItems]   = useState([]);
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
        // kick off generation lazily
        arr?.forEach(async (ev) => {
          if (ev.image_url) return;
          const dataURL = await renderEventImage(ev);
          if (!mounted) return;
          setGenMap((m) => (m[ev.id] ? m : { ...m, [ev.id]: dataURL }));
        });
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(query)]);

  if (loading) return <div className="p-4">Loading events…</div>;
  if (!items.length) return <div className="p-4 text-muted-foreground">No events yet.</div>;

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map(ev => {
        const preview = ev.image_url || genMap[ev.id];
        return (
          <Card key={ev.id} className="overflow-hidden">
            <div className="p-4 border-b">
              <div className="text-xs opacity-70">{new Date(ev.starts_at).toLocaleString()}</div>
              <div className="font-semibold text-lg">{ev.title}</div>
              <div className="text-xs">Template: <span className="font-mono">{ev.template}</span></div>
            </div>
            <CardContent className="p-4 space-y-2">
              {ev.location && <div>📍 {ev.location}</div>}
              {ev.description && <p className="text-sm leading-relaxed">{ev.description}</p>}
              {preview && (
                <img
                  src={preview}
                  alt={ev.title}
                  className="w-full h-40 object-cover rounded-md border"
                />
              )}
              {ev.data?.cta_url && (
                <Button asChild>
                  <a href={ev.data.cta_url} target="_blank" rel="noreferrer">
                    {ev.data.cta_text || 'Open link'}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
