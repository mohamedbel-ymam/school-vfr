import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement…</div>;
  return user ? <Outlet /> : <Navigate to="/connexion" replace />;
}

export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement…</div>;
  if (!user) return <Navigate to="/connexion" replace />;
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/non-autorisé" replace />;
}
