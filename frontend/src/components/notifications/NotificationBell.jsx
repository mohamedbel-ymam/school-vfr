import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import NotificationApi from "../../services/api/NotificationApi";
import { Button } from "../../components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Separator } from "../../components/ui/separator";

function fmt(s) {
  try { return new Date(s).toLocaleString(); } catch { return String(s ?? ""); }
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res = await NotificationApi.list({ per_page: 10, page: 1 });
      const payload = res?.data ?? {};
      setItems(Array.isArray(payload?.data) ? payload.data : []);
      setUnread(Number(payload?.unread_count ?? 0));
    } catch {
      setItems([]);
      setUnread(0);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await NotificationApi.markRead(id);
    } finally {
      await load();
    }
  };
  const markAll = async () => {
    try {
      await NotificationApi.markAllRead();
    } finally {
      await load();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="font-semibold">Notifications</div>
          <Button variant="ghost" size="sm" onClick={markAll}>Tout lire</Button>
        </div>
        <Separator />
        <div className="max-h-96 overflow-auto">
          {(items.length ? items : []).map((n) => (
            <div key={n.id} className="px-3 py-2 hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm opacity-80 whitespace-pre-wrap">{n.message}</div>
                  <div className="text-xs opacity-60 mt-1">{fmt(n.created_at)}</div>
                </div>
                {!n.read_at && (
                  <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>
                    Lire
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="px-3 py-6 text-center text-sm opacity-70">
              Aucune notification
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
