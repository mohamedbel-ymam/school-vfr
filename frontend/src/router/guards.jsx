// src/router/guards.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { startPathForUser } from "./index.jsx"; // adjust path if needed
import { LOGIN_ROUTE } from "./index.jsx";

function hasRole(user, needed) {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  const neededArr = Array.isArray(needed) ? needed : [needed];
  return neededArr.some(r => userRoles?.includes(r));
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null; // keep it minimal to avoid layout bleed
  // If not logged in, go to login; carry where we came from
  if (!user) {
    // Prevent redirect loop: if we are already on the login page, just render children (shouldn't happen if route tree is correct)
    if (loc.pathname === LOGIN_ROUTE || loc.pathname.startsWith(LOGIN_ROUTE + "/")) {
      return <Outlet />;
    }
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: loc }} />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;
  if (!user) {
    if (loc.pathname === LOGIN_ROUTE || loc.pathname.startsWith(LOGIN_ROUTE + "/")) {
      return <Outlet />;
    }
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: loc }} />;
  }
  return hasRole(user, roles)
    ? <Outlet />
    : <Navigate to="/non-autorisé" replace />;
}

/** Public-only guard: if logged-in, send user away from /connexion to their home */
export function GuestOnly() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (user) {
    return <Navigate to={startPathForUser(user)} replace state={{ from: loc }} />;
  }
  return <Outlet />;
}
