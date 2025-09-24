import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationApi } from "../../services/api/NotificationApi";
import { Button } from "../../components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Separator } from "../../components/ui/separator";

export default function NotificationBell(){
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const res = await NotificationApi.list({ per_page: 10 });
    setItems(res.data || []);
    setUnread(res.unread_count || 0);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await NotificationApi.markRead(id);
    await load();
  };
  const markAll = async () => {
    await NotificationApi.markAllRead();
    await load();
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
          <Button variant="ghost" size="sm" onClick={markAll}>Mark all read</Button>
        </div>
        <Separator />
        <div className="max-h-96 overflow-auto">
          {(items.length ? items : []).map(n => (
            <div key={n.id} className="px-3 py-2 hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm opacity-80 whitespace-pre-wrap">{n.message}</div>
                </div>
                {!n.read_at && (
                  <Button variant="outline" size="sm" onClick={()=>markRead(n.id)}>
                    Read
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!items.length && <div className="px-3 py-6 text-center text-sm opacity-70">No notifications</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
