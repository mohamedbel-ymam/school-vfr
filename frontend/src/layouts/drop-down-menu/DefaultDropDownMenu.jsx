import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "../../components/ui/dropdown-menu.tsx";
import { Button } from "../../components/ui/button.tsx";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

/**
 * DefaultDropDownMenu
 * A sleek, evolutive account menu used across all roles (guest, student, teacher, parent, admin).
 * - Matches the new glass header look
 * - Accepts optional children to inject role‑specific items (wrapped in a Group)
 * - Optional props: profileHref (default "/account"), dashboardHref (optional)
 */
export default function DefaultDropDownMenu({ children, profileHref = "/account", dashboardHref }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(); // calls your API and clears localStorage
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Déconnexion failed:", err);
    }
  };

  const displayName = user?.firstname || user?.lastname || user?.email || "Compte";
  const initials = getInitials(user);
  const roleFr = mapRoleFr(user?.role);

  const go = (to) => () => navigate(to);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-white/90 ring-1 ring-white/15 hover:text-white hover:bg-white/15 active:scale-95"
        >
          <div className="relative h-8 w-8 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-[11px] font-semibold text-white ring-2 ring-white/20">
            {initials || <User className="h-4 w-4" />}
            {/* status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-800" />
          </div>
          <span className="hidden sm:block max-w-[140px] truncate text-sm">
            {displayName}
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl border border-white/10 bg-gray-900/95 text-white backdrop-blur p-1"
      >
        <DropdownMenuLabel className="text-xs/5 text-white/80">
          <div className="font-semibold text-white">Mon compte</div>
          {roleFr && <div className="mt-0.5 text-[11px] text-white/60">Rôle : {roleFr}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {/* Optional built‑ins */}
        {profileHref && (
          <DropdownMenuItem onSelect={go(profileHref)} className="focus:bg-white/10 focus:text-white">
            <User className="mr-2 h-4 w-4" />
            <span>Mon profil</span>
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        {dashboardHref && (
          <DropdownMenuItem onSelect={go(dashboardHref)} className="focus:bg-white/10 focus:text-white">
            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-white/15 text-[10px]">🏠</span>
            <span>Mon espace</span>
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}

        {/* Role‑specific extra items */}
        {children && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuGroup>{children}</DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onSelect={handleLogout} className="focus:bg-red-500/15 focus:text-red-300">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(user) {
  const a = (user?.firstname || "").trim();
  const b = (user?.lastname || "").trim();
  if (a || b) return (a[0] || "").toUpperCase() + (b[0] || "").toUpperCase();
  const email = (user?.email || "").trim();
  if (!email) return "";
  return email[0].toUpperCase();
}

function mapRoleFr(r) {
  switch ((r || "").toLowerCase()) {
    case "student":
      return "Élève";
    case "teacher":
      return "Professeur";
    case "parent":
      return "Parent";
    case "admin":
      return "Administrateur";
    default:
      return "";
  }
}
