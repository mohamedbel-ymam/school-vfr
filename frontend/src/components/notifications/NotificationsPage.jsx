// src/components/Notifications/NotificationsPage.jsx
import { useEffect, useState } from "react";
// Prefer default import (works whether it's default or named)
import NotificationApi from "../../services/api/NotificationApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader } from "lucide-react";

function fmt(s) {
  try { return new Date(s).toLocaleString(); } catch { return String(s ?? ""); }
}
function AudienceBadge({ meta }) {
  const a = meta?.audience;
  if (!a) return null;
  const map = {
    all_students: "Tous les élèves",
    all_teachers: "Tous les enseignants",
    all_parents: "Tous les parents",
    degree_students: "Élèves d’un niveau",
    user: "Un utilisateur",
    users: "Utilisateurs multiples",
  };
  const label = map[a] ?? a;
  const extra =
    a === "degree_students" && meta?.degree_id ? ` · Niveau #${meta.degree_id}` :
    a === "user" && meta?.user_id ? ` · User #${meta.user_id}` :
    a === "users" && Array.isArray(meta?.user_ids) ? ` · ${meta.user_ids.length} user(s)` : "";
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
      {label}{extra}
    </span>
  );
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await NotificationApi.list({ per_page: 15, page: p });
      // Axios response: use res.data; our backend returns { data, meta, unread_count }
      const payload = res?.data ?? {};
      setItems(Array.isArray(payload.data) ? payload.data : []);
      setUnreadCount(Number(payload.unread_count ?? 0));
      const meta = payload.meta ?? payload.pagination ?? {};
      setPagination({
        current_page: meta.current_page ?? p,
        last_page: meta.last_page ?? 1,
      });
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function markRead(id) {
    // optimistic update
    setItems((cur) => cur.map(n => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n));
    await NotificationApi.markRead(id);
    await load(page);
  }
  async function markAll() {
    await NotificationApi.markAllRead();
    await load(page);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Non lues : {unreadCount}</span>
          <Button size="sm" variant="outline" onClick={markAll}>Tout marquer comme lu</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex items-center gap-2">
              <Loader className="animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="divide-y">
              {items.length === 0 && (
                <div className="p-6 text-sm opacity-70">Aucune notification.</div>
              )}

              {items.map((n) => (
                <div key={n.id} className="p-4 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{n.title}</div>
                        {/* show audience/degree from meta */}
                        <AudienceBadge meta={n.meta} />
                      </div>
                      <div className="text-sm opacity-80 whitespace-pre-wrap">{n.message}</div>
                      <div className="text-xs opacity-60 mt-1">{fmt(n.created_at)}</div>
                    </div>

                    {!n.read_at && (
                      <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                        Marquer comme lue
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={pagination.current_page <= 1}
          onClick={() => load(page - 1)}
        >
          Précédent
        </Button>
        <div className="text-sm opacity-70">
          Page {pagination.current_page} / {pagination.last_page}
        </div>
        <Button
          variant="outline"
          disabled={pagination.current_page >= pagination.last_page}
          onClick={() => load(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
