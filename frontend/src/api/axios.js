// src/api/axios.js
import axios from 'axios';

const BASE = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

// Raw backend (session, CSRF, auth) — web routes
export const axiosBase = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// API (/api prefix, needs cookie auth too)
export const axiosClient = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// --- CSRF bootstrap (cache, with force option on retry) ---
let csrfPromise = null;
export async function ensureCsrf(force = false) {
  if (force) csrfPromise = null;
  if (!csrfPromise) csrfPromise = axiosBase.get('/sanctum/csrf-cookie');
  return csrfPromise;
}

// Attach X-XSRF-TOKEN from cookie on every request (defensive)
function attachXsrf(instance) {
  instance.interceptors.request.use((config) => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (m) config.headers['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
    return config;
  });
}
attachXsrf(axiosBase);
attachXsrf(axiosClient);

// Auto-retry once on 419 (expired CSRF) or explicit CSRF mismatch
function addCsrfRetry(instance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      const { response, config } = error || {};
      if (!response || !config) throw error;

      const msg = (response.data?.message || '').toLowerCase();
      const isCsrf = response.status === 419 || msg.includes('csrf') || msg.includes('xsrf');

      if (isCsrf && !config.__retried) {
        config.__retried = true;
        await ensureCsrf(true); // force refresh cookie
        return instance(config);
      }
      throw error;
    }
  );
}
addCsrfRetry(axiosBase);
addCsrfRetry(axiosClient);

// --- Optional helpers (useful in components/contexts) ---
export async function login({ email, password }) {
  await ensureCsrf();
  return axiosBase.post('/connexion', { email, password });
}

export async function logout() {
  await ensureCsrf(); // safe
  return axiosBase.post('/deconnexion');
}

export function me() {
  return axiosClient.get('/me');
}

export default axiosClient;
