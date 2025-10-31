import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { LOGIN_ROUTE } from "../router/index.jsx";
import { HomeIcon, LogInIcon, Menu, X } from "lucide-react";
import { ModeToggle } from "../components/mode-toggle.jsx";

export default function GuestLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isLoginPage = pathname === LOGIN_ROUTE;

  const navItem = (
    <ul className="flex flex-col md:flex-row md:items-center gap-2 md:gap-1 text-sm">
      <li>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            [
              "flex items-center gap-2 rounded-full px-3 py-2 transition",
              isActive
                ? "bg-slate-900/5 text-slate-900 ring-1 ring-slate-900/10 dark:bg-white/10 dark:text-white dark:ring-white/15"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10",
            ].join(" ")
          }
          onClick={() => setOpen(false)}
        >
          <HomeIcon className="h-4 w-4" />
          Accueil
        </NavLink>
      </li>
      <li>
        <NavLink
          to={LOGIN_ROUTE}
          className={({ isActive }) =>
            [
              "flex items-center gap-2 rounded-full px-3 py-2 transition",
              isActive
                ? "bg-slate-900/5 text-slate-900 ring-1 ring-slate-900/10 dark:bg.white/10 dark:text-white dark:ring-white/15"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10",
            ].join(" ")
          }
          onClick={() => setOpen(false)}
        >
          <LogInIcon className="h-4 w-4" />
          Connexion
        </NavLink>
      </li>
    </ul>
  );

  return (
    <>
      {/* Accessibility skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] rounded bg-black px-3 py-2 text-white"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="
              mt-3 mb-3 flex items-center justify-between rounded-2xl
              border bg-white/70 shadow-xl backdrop-blur px-3 py-2
              border-slate-200/60
              dark:bg-slate-900/70 dark:border-slate-800/80
            "
          >
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-3">
                <span className="sr-only">Aller à l'accueil</span>
                <span className="hidden sm:inline font-semibold tracking-wide text-slate-800 dark:text-slate-100">
                  <Logo />
                </span>
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              {navItem}
              <div className="ml-2">
                <ModeToggle />
              </div>
            </nav>

            {/* Mobile actions */}
            <div className="flex md:hidden items-center gap-2">
              <ModeToggle />
              <button
                type="button"
                aria-label="Ouvrir le menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl
                           bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 active:scale-95
                           dark:bg-white/10 dark:text-white dark:ring-white/15"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`md:hidden ${open ? "block" : "hidden"}`} role="dialog" aria-modal="true">
          <div
            className="
              mx-4 rounded-2xl border backdrop-blur p-4
              border-slate-200/60 bg-white/80 text-slate-900
              dark:border-slate-800/80 dark:bg-slate-900/90 dark:text-white
            "
          >
            {navItem}
          </div>
        </div>
      </header>

      {/* MAIN
         - On /connexion we let the page take FULL control (no container),
           so your login's full-screen gradient/card isn't constrained.
         - On other pages, we keep a comfortable container. */}
      <main id="main" className="min-h-[calc(100vh-80px)]">
        {isLoginPage ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        )}
      </main>
    </>
  );
}
