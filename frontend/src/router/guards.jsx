// src/router/guards.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LOGIN_ROUTE } from "./pahts.js";

/* ---------------- Helpers ---------------- */

function hasRole(user, needed) {
  if (!user) return false;

  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : user.role
    ? [user.role]
    : [];

  const neededArr = Array.isArray(needed) ? needed : [needed];
  return neededArr.some((r) => userRoles.includes(r));
}

/* ---------------- Guards ---------------- */

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: loc }} />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to={LOGIN_ROUTE} replace />;

  return hasRole(user, roles)
    ? <Outlet />
    : <Navigate to="/unauthorized" replace />;
}
