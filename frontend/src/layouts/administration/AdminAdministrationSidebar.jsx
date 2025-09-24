import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../../components/ui/scroll-area.tsx";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

// Route constants (adjust paths if your router exports differ)
import {
  ADMIN_MANAGE_PARENTS_ROUTE,
  ADMIN_MANAGE_STUDENTS_ROUTE,
  ADMIN_MANAGE_TEACHERS_ROUTE,
  ADMIN_DASHBOARD_ROUTE,
  ADMIN_MANAGE_EVENTS_ROUTE,
} from "@/router/index.jsx";

// Icons
import {
  LayoutDashboard,
  Users,
  User,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Files,
  MessagesSquare,
  ClipboardList,
  Settings,
  ShieldCheck,
  LogOut,
  Bell,
} from "lucide-react";

// Local/fallback routes — keep or replace with your actual constants
const ADMIN_MANAGE_ADMINS_ROUTE = "/admin/admins";
const ADMIN_DEGREES_ROUTE = "/admin/degrees";
const ADMIN_SUBJECTS_ROUTE = "/admin/subjects";
const ADMIN_COURSES_ROUTE = "/admin/courses";
const ADMIN_TIMETABLES_ROUTE = "/admin/manage-timetables";
const ADMIN_EXAMS_ROUTE = "/admin/exams";
const ADMIN_MESSAGES_ROUTE = "/admin/messages";
const ADMIN_DOCUMENTS_ROUTE = "/admin/documents";
const ADMIN_DOCUMENTS_HOMEWORK = "/admin/devoirs";
const ADMIN_SETTINGS_ROUTE = "/admin/paramètres";
const ADMIN_ROLES_ROUTE = "/admin/roles";
const ADMIN_NOTIFICATIONS_ROUTE = "/admin/notifications";

/**
 * AdminAdministrationSidebar
 * Sidebar for admin area. Supports "collapsed" (icons only).
 */
export function AdminAdministrationSidebar({ className, collapsed = false }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const groups = [
    {
      title: "Dashboard",
      items: [{ label: "Aperçu", to: ADMIN_DASHBOARD_ROUTE, icon: LayoutDashboard }],
    },
    {
      title: "Utilisateurs",
      items: [
        { label: "Admins", to: ADMIN_MANAGE_ADMINS_ROUTE, icon: User },
        { label: "Enseignants", to: ADMIN_MANAGE_TEACHERS_ROUTE, icon: GraduationCap },
        { label: "Élèves", to: ADMIN_MANAGE_STUDENTS_ROUTE, icon: Users },
        { label: "Parents", to: ADMIN_MANAGE_PARENTS_ROUTE, icon: Users },
      ],
    },
    {
      title: "Pédagogie",
      items: [
        { label: "Niveaux", to: ADMIN_DEGREES_ROUTE, icon: GraduationCap },
        { label: "Devoirs", to: ADMIN_DOCUMENTS_HOMEWORK, icon: BookOpen },
        { label: "Cours", to: ADMIN_COURSES_ROUTE, icon: BookOpen },
        { label: "Emplois du temps", to: ADMIN_TIMETABLES_ROUTE, icon: CalendarDays },
        { label: "Examens", to: ADMIN_EXAMS_ROUTE, icon: ClipboardList },
      ],
    },
    {
      title: "Communication",
      items: [
        { label: "Événements", to: ADMIN_MANAGE_EVENTS_ROUTE, icon: CalendarDays },
        { label: "Messages", to: ADMIN_MESSAGES_ROUTE, icon: MessagesSquare },
        { label: "Documents", to: ADMIN_DOCUMENTS_ROUTE, icon: Files },
        { label: "Notifications", to: ADMIN_NOTIFICATIONS_ROUTE, icon: Bell },
      ],
    },
    {
      title: "Système",
      items: [
        { label: "Rôles & permissions", to: ADMIN_ROLES_ROUTE, icon: ShieldCheck },
        { label: "Paramètres", to: ADMIN_SETTINGS_ROUTE, icon: Settings },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <nav
      aria-label="Navigation administration"
      className={cn("pb-2 text-sm", className)}
    >
      <ScrollArea className="h-[calc(100vh-140px)] pr-1">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                  {group.title}
                </div>
              )}
              <ul className="mt-2 space-y-1 px-1">
                {group.items.map(({ label, to, icon: Icon }) => (
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
            </div>
          ))}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "mt-2 inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
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

export default AdminAdministrationSidebar;
