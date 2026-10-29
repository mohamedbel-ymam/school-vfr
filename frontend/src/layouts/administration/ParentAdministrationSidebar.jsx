// src/layouts/administration/ParentAdministrationSidebar.jsx
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area.tsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LOGIN_ROUTE } from "../../router/pahts.js";
import { House, Settings, CalendarDays, CalendarClock, LogOut, UserCircle2, Users } from "lucide-react";
import { axiosClient } from "../../api/axios";

export function ParentAdministrationSidebar({ className, collapsed = false, onSelect }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { to: "/parent/tableau de bord", label: "Tableau de bord", icon: House },
    { to: "/parent/emploi du temps", label: "Emploi du temps", icon: CalendarClock },
    { to: "/parent/événements",      label: "Événements",      icon: CalendarDays },
    { to: "/parent/paramètres",      label: "Paramètres",      icon: Settings },
  ];

  const [children, setChildren] = useState([]);
  const [loadingKids, setLoadingKids] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tryCalls = [
          () => axiosClient.get("/parent/children", { params: { per_page: 200 } }),
          () => axiosClient.get("/me/children",     { params: { per_page: 200 } }),
          () => axiosClient.get("/children",        { params: { per_page: 200 } }),
        ];
        let res = null;
        for (const fn of tryCalls) {
          try { res = await fn(); break; }
          catch (e) {
            const st = e?.response?.status;
            if (![404,405,403].includes(st)) throw e;
          }
        }
        const list = res?.data?.data ?? res?.data?.children ?? res?.data ?? [];
        setChildren(Array.isArray(list) ? list : []);
      } finally {
        setLoadingKids(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate(LOGIN_ROUTE || "/connexion", { replace: true });
    } catch (err) {
      console.error("Déconnexion failed:", err);
    }
  };

  const goWithChild = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set("child", String(id));
    navigate({ pathname: "/parent/tableau de bord", search: url.search }, { replace: false });
    onSelect?.("tableau de bord");
  };

  return (
    <nav aria-label="Navigation parent" className={cn("pb-2 text-sm", className)}>
      <ScrollArea className="h-[calc(100vh-140px)] pr-1">
        {!collapsed && (
          <div className="px-3 py-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Espace famille
            </h2>
          </div>
        )}

        <ul className="mt-1 space-y-1 px-1">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                onClick={() => onSelect?.(label)}
                className={({ isActive }) =>
                  cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                    "text-slate-700 dark:text-slate-200 ring-1 ring-transparent",
                    "hover:bg-white/50 hover:dark:bg-white/5 hover:text-slate-900 hover:dark:text-white",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50",
                    isActive && "bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white ring-white/20 font-semibold"
                  )
                }
                title={collapsed ? label : undefined}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400",
                      "group-hover:text-indigo-500",
                      "group-[aria-current=page]:text-indigo-500"
                    )}
                  />
                )}
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* --- Children group --- */}
        {!collapsed && (
          <div className="mt-5 px-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>Vos enfants</span>
            </h3>
          </div>
        )}

        <ul className="mt-2 space-y-1 px-1">
          {loadingKids && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Chargement des dossiers…</li>
          )}
          {!loadingKids && children.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Aucun élève rattaché pour le moment.</li>
          )}
          {children.map((c) => {
            const label = (c.firstname && c.lastname)
              ? `${c.firstname} ${c.lastname}` 
              : (c.name ?? `#${c.id}`);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => goWithChild(c.id)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium",
                    "text-slate-700 dark:text-slate-200 ring-1 ring-transparent",
                    "hover:bg-muted/70 hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                  )}
                  title={label}
                >
                  <UserCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Logout */}
        <div className="mt-6 px-1 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold",
              "text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Se déconnecter</span>}
          </button>
        </div>
      </ScrollArea>
    </nav>
  );
}
export default ParentAdministrationSidebar;
