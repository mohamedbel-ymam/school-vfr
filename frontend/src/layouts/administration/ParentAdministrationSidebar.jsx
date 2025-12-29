// src/layouts/administration/ParentAdministrationSidebar.jsx
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area.tsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { LOGIN_ROUTE } from "../../router/pahts.js";
import { House, Settings, CalendarDays, CalendarClock, LogOut, UserCircle2 } from "lucide-react";
import { axiosClient } from "../../api/axios";

export function ParentAdministrationSidebar({ className, activeKey, onSelect, collapsed = false }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const items = [
    { key: "tableau de bord", label: "Tableau de bord", icon: House },
    { key: "emploi du temps", label: "Emploi du temps", icon: CalendarClock },
    { key: "événements",      label: "Événements",      icon: CalendarDays },
    { key: "paramètres",      label: "Paramètres",      icon: Settings },
  ];

  const [children, setChildren] = useState([]);
  const [loadingKids, setLoadingKids] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // mimic your “firstOk” behavior inline (no import needed)
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

  // push ?child=<id> on click (stays on same page)
  const goWithChild = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set("child", String(id));
    navigate({ pathname: location.pathname, search: url.search }, { replace: false });
    // Also ping the left menu target if needed
    onSelect?.("tableau de bord");
  };

  return (
    <nav aria-label="Navigation parent" className={cn("pb-2 text-sm", className)}>
      <ScrollArea className="h-[calc(100vh-140px)] pr-1">

        {!collapsed && (
          <div className="px-3 py-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Espace parent
            </h2>
          </div>
        )}

        <ul className="mt-1 space-y-1 px-1">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeKey;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelect?.(key)}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                    "text-slate-700 dark:text-slate-200 ring-1 ring-transparent",
                    "hover:bg-white/50 hover:dark:bg-white/5 hover:text-slate-900 hover:dark:text-white",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50",
                    isActive && "bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white ring-white/20"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400",
                        "group-hover:text-indigo-500",
                        isActive && "text-indigo-500"
                      )}
                    />
                  )}
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* --- Children group --- */}
        {!collapsed && (
          <div className="mt-3 px-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Vos enfants
            </h3>
          </div>
        )}

        <ul className="mt-1 space-y-1 px-1">
          {loadingKids && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Chargement…</li>
          )}
          {!loadingKids && children.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Aucun enfant rattaché.</li>
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
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                    "text-slate-700 dark:text-slate-200 ring-1 ring-transparent",
                    "hover:bg-white/50 hover:dark:bg-white/5 hover:text-slate-900 hover:dark:text-white"
                  )}
                  title={label}
                >
                  <UserCircle2 className="h-4 w-4 text-slate-500 group-hover:text-indigo-500" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Logout */}
        <div className="mt-2 px-1">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
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
