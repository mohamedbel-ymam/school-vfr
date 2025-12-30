// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { axiosClient, ensureCsrf } from "../api/axios";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function normalizeUser(u) {
  if (!u) return null;

  const roles = Array.isArray(u.roles)
    ? u.roles
    : u.role
    ? [u.role]
    : [];

  return {
    ...u,
    roles,
    role: u.role ?? roles[0] ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

const AuthContext = createContext(null);

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------------------------------------ */
  /* Bootstrap auth (ONCE)                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await ensureCsrf();
        const res = await axiosClient.get("/me");
        if (alive) setUser(normalizeUser(res.data));
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                   */
  /* ------------------------------------------------------------------------ */

  const login = async ({ email, password }) => {
    await ensureCsrf();
    await axiosClient.post("/connexion", { email, password });

    const res = await axiosClient.get("/me");
    const normalized = normalizeUser(res.data);
    setUser(normalized);
    return normalized;
  };

  const logout = async () => {
    try {
      await axiosClient.post("/deconnexion");
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const res = await axiosClient.get("/me");
    const normalized = normalizeUser(res.data.data);
    setUser(normalized);
    return normalized;
  };

  /* ------------------------------------------------------------------------ */
  /* Derived                                                                   */
  /* ------------------------------------------------------------------------ */

  const roles = user?.roles ?? [];

  const value = useMemo(
    () => ({
      user,
      roles,
      loading,
      login,
      logout,
      refreshUser,
      hasRole: (r) => roles.includes(r),
      anyRole: (arr = []) => arr.some((r) => roles.includes(r)),
      setUser,
    }),
    [user, roles, loading]
  );

  if (loading) return <div>Chargement…</div>;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export const useAuth = () => useContext(AuthContext);
