// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { axiosClient, login as loginApi } from "../api/axios";

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

  const didLoginRef = useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Bootstrap auth (ONCE on app load)                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (didLoginRef.current) return;

        const res = await axiosClient.get("/me");
        if (alive) {
          setUser(normalizeUser(res.data.data));
        }
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

  const login = async ({ login, password }) => {
    didLoginRef.current = true;

    // 🔥 MUST use axios login helper (CSRF handled there)
    await loginApi({ login, password });

    const res = await axiosClient.get("/me");
    const normalized = normalizeUser(res.data.data);

    setUser(normalized);
    setLoading(false);

    return normalized;
  };

  const logout = async () => {
    try {
      await axiosClient.post("/deconnexion");
    } finally {
      didLoginRef.current = false;
      setUser(null);
      setLoading(false);
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

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Chargement…</div> : children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
