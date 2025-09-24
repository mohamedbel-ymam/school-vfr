import { useEffect, useState } from "react";
import { EventApi } from "../../services/api/EventApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";


export default function EventsList({ query = {} }) {
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);


useEffect(() => {
let mounted = true;
(async () => {
try {
const res = await EventApi.list(query);
if (mounted) setItems(res.data || []);
} finally { setLoading(false); }
})();
return () => { mounted = false; };
}, [JSON.stringify(query)]);


if (loading) return <div className="p-4">Loading events…</div>;


if (!items.length) return <div className="p-4 text-muted-foreground">No events yet.</div>;


return (
<div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
{items.map(ev => (
<Card key={ev.id} className="overflow-hidden">
<div className="p-4 border-b">
<div className="text-xs opacity-70">{new Date(ev.starts_at).toLocaleString()}</div>
<div className="font-semibold text-lg">{ev.title}</div>
<div className="text-xs">Template: <span className="font-mono">{ev.template}</span></div>
</div>
<CardContent className="p-4 space-y-2">
{ev.location && <div>📍 {ev.location}</div>}
{ev.description && <p className="text-sm leading-relaxed">{ev.description}</p>}
{ev.image_url && (
  <img
    src={ev.image_url}
    alt={ev.title}
    className="w-full h-40 object-cover rounded-md border"
  />
)}
{ev.data?.cta_url && (
<Button asChild>
<a href={ev.data.cta_url} target="_blank" rel="noreferrer">{ev.data.cta_text || 'Open link'}</a>
</Button>
)}
</CardContent>
</Card>
))}
</div>
);
}