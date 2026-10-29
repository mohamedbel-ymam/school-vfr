import React, { useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import { ModeToggle } from "../components/mode-toggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { LOGIN_ROUTE, STUDENT_DASHBOARD_ROUTE } from "../router/pahts.js";

import Logo from "../components/Logo.jsx";
import StudentDropDownMenu from "./drop-down-menu/StudentDropDownMenu.jsx";
import { StudentAdministrationSidebar } from "./administration/StudentAdministrationSidebar.jsx";
import { GaugeIcon, Menu, X, GraduationCap, ArrowLeft } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell.jsx";

export default function StudentDashboardLayout() {
  const { user, loading } = useAuth();
  const [asideOpen, setAsideOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Chargement de l'espace élève…
      </div>
    );
  }
  if (!user || user.role !== "student") return <Navigate to={LOGIN_ROUTE} replace />;

  const DashboardLink = ({ onClick }) => (
    <NavLink
      to={STUDENT_DASHBOARD_ROUTE}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`
      }
    >
      <GaugeIcon className="h-4 w-4" />
      <span>Tableau de bord</span>
    </NavLink>
  );

  const studentName = user.firstname && user.lastname
    ? `${user.firstname} ${user.lastname}`
    : user.name || "Élève";

  const degreeName = user.degree?.name || user.degree_name || user.classe?.name || "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-lg"
      >
        Aller au contenu principal
      </a>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full transition-all duration-200 backdrop-blur-md bg-background/85 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand + mobile menu button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Ouvrir le menu"
                onClick={() => setAsideOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link
                to={STUDENT_DASHBOARD_ROUTE}
                className="flex items-center gap-3 transition-opacity hover:opacity-95"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-white/10 p-1 flex items-center justify-center shadow-sm border border-slate-800/20 dark:border-white/15">
                  <Logo />
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-bold tracking-tight text-foreground leading-tight">
                    Takwa Établissement
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                      <GraduationCap className="h-3 w-3" /> Espace Élève
                    </span>
                    <span className="truncate max-w-[130px] font-semibold text-foreground">
                      {studentName}
                    </span>
                    {degreeName && (
                      <span className="text-muted-foreground/80 hidden lg:inline">
                        • {degreeName}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Actions */}
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors mr-1"
                title="Consulter le site public"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Site public</span>
              </Link>
              <DashboardLink />
              <div className="mx-1 h-5 w-px bg-border" />
              <NotificationBell />
              <ModeToggle />
              <StudentDropDownMenu />
            </nav>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <NotificationBell />
              <ModeToggle />
              <StudentDropDownMenu />
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <div
        className={`${asideOpen ? "fixed" : "hidden"} inset-0 z-[60] md:hidden`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAsideOpen(false);
        }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-50"
          onClick={() => setAsideOpen(false)}
        />

        <aside
          id="mobile-aside"
          className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto border-r border-border bg-card p-4 shadow-2xl animate-in slide-in-from-left duration-200"
          onClick={(e) => {
            const el = e.target.closest("a,button,[data-close-drawer]");
            if (el) setAsideOpen(false);
          }}
        >
          <div className="mb-4 flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-white/10 p-1 flex items-center justify-center">
                <Logo />
              </div>
              <span className="text-xs font-bold text-foreground">Menu Élève</span>
            </div>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
              aria-label="Fermer le menu"
              onClick={() => setAsideOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3">
            <DashboardLink onClick={() => setAsideOpen(false)} />
          </div>

          <StudentAdministrationSidebar />
        </aside>
      </div>

      {/* MAIN CONTENT WITH SIDEBAR */}
      <main id="main" className="flex-1 w-full flex flex-col">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          <div className="flex gap-6 items-start">
            {/* Desktop sticky sidebar */}
            <aside className="hidden md:block w-72 shrink-0 sticky top-[88px] self-start rounded-2xl border border-border bg-card p-3 shadow-sm">
              <StudentAdministrationSidebar />
            </aside>

            {/* Dynamic Content Outlet */}
            <section className="min-w-0 flex-1 w-full">
              <Outlet />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
