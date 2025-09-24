import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { LOGIN_ROUTE } from "../router/index.jsx";
import { HomeIcon, LogInIcon, Menu, X } from "lucide-react";
import { ModeToggle } from "../components/mode-toggle.jsx";

// GuestLayout.jsx
// Modern, evolutive header for unauthenticated pages.
// No redirects here — your router's GuestOnly guard should handle access.

export default function GuestLayout() {
  const [open, setOpen] = useState(false);

  const navItem = (
    <ul className="flex flex-col md:flex-row md:items-center gap-2 md:gap-1 text-sm">
      <li>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-3 py-2 transition ${
              isActive
                ? "bg-white/15 text-white ring-1 ring-white/20"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`
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
            `flex items-center gap-2 rounded-full px-3 py-2 transition ${
              isActive
                ? "bg-white/15 text-white ring-1 ring-white/20"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`
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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] rounded bg-black px-3 py-2 text-white">Aller au contenu</a>

      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-3 mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-gray-800/80 shadow-xl backdrop-blur px-3 py-2">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-3">
                <span className="sr-only">Aller à l'accueil</span>
                <span className="hidden sm:inline text-white font-semibold tracking-wide">
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 active:scale-95"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`md:hidden ${open ? "block" : "hidden"}`} role="dialog" aria-modal="true">
          <div className="mx-4 rounded-2xl border border-white/10 bg-gray-900/90 text-white backdrop-blur p-4">
            {navItem}
          </div>
        </div>
      </header>

      <main id="main" className="min-h-[calc(100vh-80px)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </>
  );
}
