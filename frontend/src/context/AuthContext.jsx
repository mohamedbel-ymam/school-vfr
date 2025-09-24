import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosBase, axiosClient, ensureCsrf } from '../api/axios';

const AuthContext = createContext({
  user: null,
  roles: [],
  login: async () => {},
  logout: async () => {},
  loading: true,
  hasRole: () => false,
  anyRole: () => false,
  refreshUser: async () => {},
});

function normalizeUser(u) {
  if (!u) return null;
  const roles = Array.isArray(u.roles)
    ? u.roles
    : (u.role ? [u.role] : []);
  // keep legacy compatibility: expose `role` as the highest one if missing
  const role = u.role ?? roles[0] ?? null;
  return { ...u, roles, role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const res = await axiosClient.get('/me');
    const payload = res?.data?.data ?? res?.data ?? null;
    setUser(normalizeUser(payload));
    return payload;
  };

  // Initial bootstrap: CSRF + /api/me
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await ensureCsrf();
        const res = await axiosClient.get('/me');
        if (!isMounted) return;
        const payload = res?.data?.data ?? res?.data ?? null;
        setUser(normalizeUser(payload));
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const login = async ({ email, password }) => {
    await ensureCsrf();
    // IMPORTANT: web route (no /api), expects JSON (no redirect)
    await axiosBase.post('/connexion', { email, password });
    const me = await refreshUser();
    return normalizeUser(me);
  };

  const logout = async () => {
    try {
      await ensureCsrf();
      // IMPORTANT: web route (no /api)
      await axiosBase.post('/deconnexion');
    } catch (err) {
      // ignore; still clear local state
      console.error('Déconnexion failed:', err);
    } finally {
      setUser(null);
    }
  };

  const roles = user?.roles ?? (user?.role ? [user.role] : []);

  const value = {
    user,
    roles,
    login,
    logout,
    loading,
    refreshUser,
    hasRole: (r) => roles.includes(r),
    anyRole: (arr = []) => arr.some((r) => roles.includes(r)),
    setUser, // if needed elsewhere
  };

  if (loading) return <div>Chargement…</div>;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
