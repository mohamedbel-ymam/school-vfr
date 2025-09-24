// src/layouts/administration/TeacherAdministrationSidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area.tsx";
import { useAuth } from "../../context/AuthContext.jsx";
import SidebarNotificationsLink from "../../components/notifications/SidebarNotificationsLink.jsx";
import { LOGIN_ROUTE } from "../../router/index.jsx";

import {
  House,
  CalendarDays,
  BookOpen,
  ClipboardList,
  BarChart2,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

/**
 * TeacherAdministrationSidebar
 * Responsive, glass-compatible sidebar aligned with the new layouts.
 */
export function TeacherAdministrationSidebar({ className, collapsed = false }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const items = [
    { label: "Tableau de bord", to: "/enseignant/tableau de bord", icon: House },
    { label: "Emploi du temps", to: "/enseignant/emploi du temps", icon: CalendarDays },
    { label: "Mes cours",       to: "/enseignant/courses",         icon: BookOpen },
    { label: "Devoirs",         to: "/enseignant/devoirs",         icon: ClipboardList },
    { label: "Examens",         to: "/enseignant/exams",           icon: ClipboardList },
    { label: "Notes",           to: "/enseignant/grades",          icon: BarChart2 },
    { label: "Messages",        to: "/enseignant/messages",        icon: MessageSquare },
    { label: "Événements",      to: "/enseignant/événements",      icon: CalendarDays },
    { label: "Documents",       to: "/enseignant/documents",       icon: FileText },
    { label: "Paramètres",      to: "/enseignant/paramètres",      icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate(LOGIN_ROUTE || "/connexion", { replace: true });
    } catch (err) {
      console.error("Déconnexion failed:", err);
    }
  };

  return (
    <nav aria-label="Navigation enseignant" className={cn("pb-2 text-sm", className)}>
      <ScrollArea className="h-[calc(100vh-140px)] pr-1">
        {!collapsed && (
          <div className="px-3 py-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Espace professeur
            </h2>
          </div>
        )}

        <ul className="mt-1 space-y-1 px-1">
          {items.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 ring-1 ring-transparent",
                    "hover:bg-white/50 hover:dark:bg-white/5 hover:text-slate-900 hover:dark:text-white",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50",
                    isActive
                      ? "bg-white/70 dark:bg-white/10 text-slate-900 dark:text-white ring-white/20"
                      : ""
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

        {/* Notifications */}
        <div className="mt-2 px-1">
          <SidebarNotificationsLink to="/enseignant/notifications" label="Notifications" />
        </div>

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

export default TeacherAdministrationSidebar;
