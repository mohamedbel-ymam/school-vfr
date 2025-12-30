// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { axiosBase, axiosClient, ensureCsrf } from "../api/axios";

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

function getCookie(name) {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" +
        name.replace(/([$?*|{}()[\]\\/+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : null;
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
  const [bootstrapped, setBootstrapped] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Axios response interceptor (NO CSRF HERE)                                 */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    const id = axiosClient.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error?.response?.status === 401 && bootstrapped) {
          setUser(null);
          window.dispatchEvent(new Event("auth:unauthorized"));
        }
        throw error;
      }
    );

    return () => axiosClient.interceptors.response.eject(id);
  }, [bootstrapped]);

  /* ------------------------------------------------------------------------ */
  /* Fetch current user                                                        */
  /* ------------------------------------------------------------------------ */

  const refreshUser = async () => {
    const res = await axiosClient.get("/me");
    const normalized = normalizeUser(res.data);
    setUser(normalized);
    return normalized;
  };

  /* ------------------------------------------------------------------------ */
  /* Initial bootstrap                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // ONLY once on load
        await ensureCsrf();

        const res = await axiosClient.get("/me");
        if (!alive) return;

        setUser(normalizeUser(res.data));
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.error("Auth bootstrap error:", err);
        }
        if (alive) setUser(null);
      } finally {
        if (alive) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Login                                                                     */
  /* ------------------------------------------------------------------------ */

  const login = async ({ email, password }) => {
    await ensureCsrf();

    const token = getCookie("XSRF-TOKEN");

    await axiosBase.post(
      "/connexion",
      { email, password },
      token
        ? { headers: { "X-XSRF-TOKEN": token } }
        : undefined
    );

    return refreshUser();
  };

  /* ------------------------------------------------------------------------ */
  /* Logout                                                                    */
  /* ------------------------------------------------------------------------ */

  const logout = async () => {
    try {
      await ensureCsrf();
      await axiosBase.post("/deconnexion");
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setUser(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Derived values                                                            */
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export const useAuth = () => useContext(AuthContext);
