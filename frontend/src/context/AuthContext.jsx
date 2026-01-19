import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

  /* ------------------------------------------------------------------------ */
  /* Bootstrap auth (RUN ONCE ON APP LOAD)                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    axiosClient
      .get("/me")
      .then((res) => {
        if (!alive) return;
        setUser(normalizeUser(res.data.data));
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                   */
  /* ------------------------------------------------------------------------ */

  const login = async ({ login, password }) => {
    // 1️⃣ Authenticate (session cookie)
    await loginApi({ login, password });

    // 2️⃣ Fetch authenticated user
    const res = await axiosClient.get("/me");
    const normalized = normalizeUser(res.data.data);

    // 3️⃣ Store user
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
      hasRole: (role) => roles.includes(role),
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
