import { useEffect, useState } from "react";
import { NotificationApi } from "../../services/api/NotificationApi";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader } from "lucide-react";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]   = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await NotificationApi.list({ per_page: 15, page: p });
      setItems(res.data || []);
      setUnreadCount(res.unread_count || 0);
      setPagination(res.pagination || { current_page: 1, last_page: 1 });
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const markRead = async (id) => { await NotificationApi.markRead(id); load(page); };
  const markAll = async () => { await NotificationApi.markAllRead(); load(page); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Unread: {unreadCount}</span>
          <Button size="sm" variant="outline" onClick={markAll}>Mark all read</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex items-center gap-2"><Loader className="animate-spin" /> Loading…</div>
          ) : (
            <div className="divide-y">
              {items.length === 0 && <div className="p-6 text-sm opacity-70">No notifications yet.</div>}
              {items.map(n => (
                <div key={n.id} className="p-4 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-sm opacity-80 whitespace-pre-wrap">{n.message}</div>
                      <div className="text-xs opacity-60 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!n.read_at && (
                      <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                        Mark read
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
          Previous
        </Button>
        <div className="text-sm opacity-70">
          Page {pagination.current_page} / {pagination.last_page}
        </div>
        <Button
          variant="outline"
          disabled={pagination.current_page >= pagination.last_page}
          onClick={() => load(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
