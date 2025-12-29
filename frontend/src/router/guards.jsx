// src/router/guards.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { startPathForUser, LOGIN_ROUTE } from "./index.jsx";

function hasRole(user, needed) {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : [user.role].filter(Boolean);

  const neededArr = Array.isArray(needed) ? needed : [needed];
  return neededArr.some((r) => userRoles.includes(r));
}

/* -------------------------------------------------------------------------- */
/* Require authentication                                                      */
/* -------------------------------------------------------------------------- */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;

  if (!user) {
    if (loc.pathname.startsWith(LOGIN_ROUTE)) {
      return <Outlet />;
    }
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: loc }} />;
  }

  return <Outlet />;
}

/* -------------------------------------------------------------------------- */
/* Require role                                                                */
/* -------------------------------------------------------------------------- */
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;

  if (!user) {
    if (loc.pathname.startsWith(LOGIN_ROUTE)) {
      return <Outlet />;
    }
    return <Navigate to={LOGIN_ROUTE} replace state={{ from: loc }} />;
  }

  if (!hasRole(user, roles)) {
    return <Navigate to="/non-autorisé" replace />;
  }

  return <Outlet />;
}

/* -------------------------------------------------------------------------- */
/* Guest only (login/register pages)                                           */
/* -------------------------------------------------------------------------- */
export function GuestOnly() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;

  if (user) {
    return <Navigate to={startPathForUser(user)} replace state={{ from: loc }} />;
  }

  return <Outlet />;
}
