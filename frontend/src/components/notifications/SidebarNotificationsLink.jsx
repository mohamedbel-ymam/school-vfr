import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationApi } from "../../services/api/NotificationApi";

export default function SidebarNotificationsLink({ to = "/notifications", label = "Notifications", className = "" }) {
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();

  const load = async () => {
    const res = await NotificationApi.list({ per_page: 1 }); // light call, returns unread_count
    setUnread(res.unread_count || 0);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  const active = pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center justify-between px-3 py-2 rounded hover:bg-muted ${active ? "bg-muted font-medium" : ""} ${className}`}
    >
      <span>{label}</span>
      {unread > 0 && (
        <span className="text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{unread}</span>
      )}
    </Link>
  );
}
