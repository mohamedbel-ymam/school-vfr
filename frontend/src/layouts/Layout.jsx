import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { LOGIN_ROUTE } from "../router/pahts.js";
import {
  HomeIcon,
  LogInIcon,
  Menu,
  X,
  BookOpen,
  Award,
  Calendar,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ModeToggle } from "../components/mode-toggle.jsx";

export default function Layout() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: "Accueil", to: "/", icon: HomeIcon, isAnchor: false },
    { label: "Cycles & Filières", to: "/#cycles", icon: BookOpen, isAnchor: true },
    { label: "Pédagogie", to: "/#pedagogie", icon: Sparkles, isAnchor: true },
    { label: "Bourse Top 3", to: "/#bourse", icon: Award, isAnchor: true },
    { label: "Événements", to: "/#evenements", icon: Calendar, isAnchor: true },
    { label: "FAQ", to: "/#faq", icon: HelpCircle, isAnchor: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-400">
      {/* Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium shadow-lg"
      >
        Aller au contenu principal
      </a>

      {/* Top Banner / Academic year notice */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 text-center border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30">
            Session 2026 – 2027
          </span>
          <span className="hidden sm:inline">
            Établissement Takwa — Soutien scolaire d'excellence, rigueur méthodologique et parrainage post-bac
          </span>
          <Link
            to="/waiting-list"
            className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 underline decoration-amber-400/50 underline-offset-2 ml-1"
          >
            Liste d'attente <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full transition-all duration-200 backdrop-blur-md bg-background/85 border-b border-border/60 supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand Logo & Name */}
            <Link
              to="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl py-1 px-1.5"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-white/10 p-1 flex items-center justify-center shadow-sm border border-slate-800/20 dark:border-white/15">
                <Logo />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                  Takwa Établissement
                </span>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground hidden sm:block">
                  Groupe Scolaire d'Excellence
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.to}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Right actions: Theme + Connexion */}
            <div className="flex items-center gap-2.5">
              <ModeToggle />

              <Link
                to={LOGIN_ROUTE}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <LogInIcon className="h-4 w-4" />
                <span>Espace Numérique</span>
              </Link>

              {/* Mobile menu button */}
              <button
                type="button"
                aria-label="Ouvrir le menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {open && (
          <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur px-4 pt-2 pb-6 space-y-3 animate-in fade-in-50 duration-200">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-border/80">
              <Link
                to={LOGIN_ROUTE}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm"
              >
                <LogInIcon className="h-4 w-4" />
                <span>Connexion aux Espaces</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main" className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
