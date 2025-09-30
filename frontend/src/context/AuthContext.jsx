// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { axiosBase, axiosClient, ensureCsrf } from "../api/axios";

/** Normalize API user payload to always expose { role, roles[] } */
function normalizeUser(u) {
  if (!u) return null;
  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  const role = u.role ?? roles[0] ?? null;
  return { ...u, roles, role };
}

/** Tiny cookie reader (for belt & suspenders CSRF header) */
function getCookie(name) {
  const m = document.cookie.match(
    new RegExp(
      '(^|; )' +
        name.replace(/([$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : null;
}

const AuthContext = createContext({
  user: null,
  roles: [],
  loading: true,
  login: async (_creds) => {},
  logout: async () => {},
  refreshUser: async () => {},
  hasRole: (_r) => false,
  anyRole: (_arr) => false,
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------- Axios auto-handling for /api calls ---------- */
  // Retry once on 419 by refreshing CSRF; on 401, clear session
  useEffect(() => {
    let retrying = false;
    const id = axiosClient.interceptors.response.use(
      (r) => r,
      async (error) => {
        const status = error?.response?.status;
        const cfg = error?.config || {};
        if (status === 419 && !retrying) {
          retrying = true;
          try {
            await ensureCsrf();
            return await axiosClient.request(cfg);
          } finally {
            retrying = false;
          }
        }
        if (status === 401) {
          setUser(null);
          // Optional: let app know
          window.dispatchEvent(new Event("auth:unauthorized"));
        }
        throw error;
      }
    );
    return () => axiosClient.interceptors.response.eject(id);
  }, []);

  /* ---------- Helpers ---------- */
  const refreshUser = async () => {
    const res = await axiosClient.get("/me");
    const payload = res?.data?.data ?? res?.data ?? null;
    const normalized = normalizeUser(payload);
    setUser(normalized);
    return normalized;
  };

  // Initial bootstrap: set CSRF + try to fetch current user
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureCsrf();
        const normalized = await refreshUser();
        if (!alive) return;
        setUser(normalized);
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

  const login = async ({ email, password }) => {
    await ensureCsrf(); // set XSRF-TOKEN + session on .takwaetablissement.com
    const token = getCookie("XSRF-TOKEN"); // force header explicitly
    await axiosBase.post(
      "/connexion",
      { email, password },
      token
        ? {
            headers: {
              "X-XSRF-TOKEN": token,
              Accept: "application/json",
            },
            withCredentials: true,
          }
        : { headers: { Accept: "application/json" }, withCredentials: true }
    );
    return await refreshUser();
  };

  const logout = async () => {
    try {
      await ensureCsrf();
      const token = getCookie("XSRF-TOKEN");
      await axiosBase.post(
        "/deconnexion",
        {},
        token
          ? {
              headers: {
                "X-XSRF-TOKEN": token,
                Accept: "application/json",
              },
              withCredentials: true,
            }
          : { headers: { Accept: "application/json" }, withCredentials: true }
      );
    } catch (err) {
      // non-fatal – still clear local state
      console.error("Déconnexion failed:", err);
    } finally {
      setUser(null);
    }
  };

  const roles = user?.roles ?? (user?.role ? [user.role] : []);
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

export const useAuth = () => useContext(AuthContext);
