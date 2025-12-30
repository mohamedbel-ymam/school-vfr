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

/** Normalize API user payload to always expose { role, roles[] } */
function normalizeUser(u) {
  if (!u) return null;

  const roles = Array.isArray(u.roles)
    ? u.roles
    : u.role
    ? [u.role]
    : [];

  const role = u.role ?? roles[0] ?? null;

  return { ...u, roles, role };
}

/** Tiny cookie reader (for explicit CSRF header when needed) */
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

const AuthContext = createContext({
  user: null,
  roles: [],
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  hasRole: () => false,
  anyRole: () => false,
  setUser: () => {},
});

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Axios interceptors                                                        */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    let retrying = false;

    const id = axiosClient.interceptors.response.use(
      (r) => r,
      async (error) => {
        const status = error?.response?.status;
        const cfg = error?.config || {};

        // Retry once on CSRF expiration
        if (status === 419 && !retrying) {
          retrying = true;
          try {
            await ensureCsrf();
            return await axiosClient.request(cfg);
          } finally {
            retrying = false;
          }
        }

        // ❗ Only logout AFTER bootstrap
        if (status === 401 && bootstrapped) {
          setUser(null);
          window.dispatchEvent(new Event("auth:unauthorized"));
        }

        throw error;
      }
    );

    return () => axiosClient.interceptors.response.eject(id);
  }, [bootstrapped]);

  /* ------------------------------------------------------------------------ */
  /* API helpers                                                               */
  /* ------------------------------------------------------------------------ */

  const refreshUser = async () => {
    const res = await axiosClient.get("/me"); // must return FULL user
    const normalized = normalizeUser(res.data);
    setUser(normalized);
    return normalized;
  };

  /* ------------------------------------------------------------------------ */
  /* Bootstrap auth                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await ensureCsrf();

        const res = await axiosClient.get("/me");
        const normalized = normalizeUser(res.data);

        if (alive) setUser(normalized);
      } catch (err) {
        // Ignore unauthenticated user on first load
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
  /* Auth actions                                                              */
  /* ------------------------------------------------------------------------ */

  const login = async ({ email, password }) => {
    await ensureCsrf();

    const token = getCookie("XSRF-TOKEN");

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
        : {
            headers: { Accept: "application/json" },
            withCredentials: true,
          }
    );

    return await refreshUser(); // subject INCLUDED
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
          : {
              headers: { Accept: "application/json" },
              withCredentials: true,
            }
      );
    } catch (err) {
      console.error("Logout error:", err);
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

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return <div>Chargement…</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                        */
/* -------------------------------------------------------------------------- */

export const useAuth = () => useContext(AuthContext);
