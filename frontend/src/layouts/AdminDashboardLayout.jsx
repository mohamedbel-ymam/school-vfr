import React, { useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { LOGIN_ROUTE, redirectToDashboard, STUDENT_DASHBOARD_ROUTE } from "../router/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { GaugeIcon, Menu, X } from "lucide-react";
import { ModeToggle } from "../components/mode-toggle.jsx";
import {AdminAdministrationSidebar} from "./administration/AdminAdministrationSidebar.jsx";
import AdminDropDownMenu from "./drop-down-menu/AdminDropDownMenu.jsx";
import NotificationBell from "../components/notifications/NotificationBell.jsx";

// Modern, evolutive admin layout:
// - Sticky glass header (responsive)
// - Desktop: left sticky sidebar + main content
// - Mobile: sidebar becomes a slide-in drawer
// - Routes kept as in your snippet (Dashboard link -> STUDENT_DASHBOARD_ROUTE). Change if you prefer ADMIN_* later.

export default function AdminDashboardLayout() {
  const { user, loading } = useAuth();
  const [asideOpen, setAsideOpen] = useState(false);

  if (loading) return <div className="p-6 text-sm">Chargement…</div>;
  if (!user) return <Navigate to={LOGIN_ROUTE} replace />;
  if (user.role !== "admin") return <Navigate to={redirectToDashboard(user.role)} replace />;

  const DashboardLink = ({ onClick }) => (
    <NavLink
      to={STUDENT_DASHBOARD_ROUTE}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
          isActive
            ? "bg-white/15 text-white ring-1 ring-white/20"
            : "text-white/80 hover:text-white hover:bg-white/10"
        }`
      }
    >
      <GaugeIcon className="h-4 w-4" />
      Dashboard
    </NavLink>
  );

  return (
    <>
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] rounded bg-black px-3 py-2 text-white">Aller au contenu</a>

      {/* HEADER */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-3 mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-gray-800/80 shadow-xl backdrop-blur px-3 py-2">
            {/* Left: brand + mobile aside toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 active:scale-95"
                aria-label="Ouvrir le menu"
                onClick={() => setAsideOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to={STUDENT_DASHBOARD_ROUTE} className="inline-flex items-center gap-3">
                <span className="sr-only">Aller au tableau de bord</span>
                <span className="hidden sm:inline text-white font-semibold tracking-wide">
                  <Logo />
                </span>
              </Link>
            </div>

            {/* Desktop actions */}
            <nav className="hidden md:flex items-center gap-2">
              <DashboardLink />
              <div className="mx-1 h-6 w-px bg-white/10" />
              <NotificationBell />
              <ModeToggle />
              <AdminDropDownMenu />
            </nav>

            {/* Mobile actions */}
            <div className="flex md:hidden items-center gap-2 text-white">
              <NotificationBell />
              <ModeToggle />
              <AdminDropDownMenu />
            </div>
          </div>
        </div>
      </header>

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
    className="absolute inset-0 bg-black/40"
    onClick={() => setAsideOpen(false)}
  />

  <aside
    id="mobile-aside"
    className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto rounded-r-2xl border-r border-white/10 bg-gray-900 text-white p-4"
    onClick={(e) => {
      const el = e.target.closest("a,button,[data-close-drawer]");
      if (el) setAsideOpen(false);
    }}
  >
    {/* (Optional) you can keep/remove this internal X */}
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-semibold">Menu</span>
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"
        aria-label="Fermer le menu"
        onClick={() => setAsideOpen(false)}
      >
        <X className="h-5 w-5" />
      </button>
    </div>

    <div className="mb-3">
      <DashboardLink onClick={() => setAsideOpen(false)} />
    </div>

    <AdminAdministrationSidebar />
  </aside>
</div>


      {/* MAIN AREA */}
      <main id="main" className="min-h-[calc(100vh-80px)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-4">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-72 shrink-0 sticky top-[96px] self-start">
              <AdminAdministrationSidebar />
            </aside>

            {/* Content */}
            <section className="min-w-0 flex-1">
              <Outlet />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
