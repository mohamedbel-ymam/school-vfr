import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireRole({ allow = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // ou un spinner
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const roles = user.roles || [];
  const ok = allow.some((r) => roles.includes(r));
  return ok ? children : <Navigate to="/unauthorized" replace />;
}
