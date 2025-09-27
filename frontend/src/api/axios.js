// src/api/axios.js
import axios from "axios";

// Prefer VITE_API_BASE_URL, then VITE_BACKEND_URL; smart fallback by environment
function resolveBaseUrl() {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "";

  if (raw) return raw.replace(/\/+$/, "");

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal ? "http://localhost:8000" : "https://api.takwaetablissement.com";
}

const BASE = resolveBaseUrl();

// --- axios instances ---
export const axiosBase = axios.create({
  baseURL: BASE, // web routes: csrf, login/logout
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

export const axiosClient = axios.create({
  baseURL: `${BASE}/api`, // API routes
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// --- CSRF bootstrap (cache, with force option on retry) ---
let csrfPromise = null;
export async function ensureCsrf(force = false) {
  if (force) csrfPromise = null;
  if (!csrfPromise) csrfPromise = axiosBase.get("/sanctum/csrf-cookie");
  return csrfPromise;
}

// Attach X-XSRF-TOKEN from cookie on every request (defensive)
function attachXsrf(instance) {
  instance.interceptors.request.use((config) => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (m) config.headers["X-XSRF-TOKEN"] = decodeURIComponent(m[1]);
    return config;
  });
}
attachXsrf(axiosBase);
attachXsrf(axiosClient);

// Auto-retry once on 419 (expired CSRF) or CSRF mismatch
function addCsrfRetry(instance) {
  instance.interceptors.response.use(
    (r) => r,
    async (error) => {
      const { response, config } = error || {};
      if (!response || !config) throw error;

      const msg = (response.data?.message || "").toLowerCase();
      const isCsrf = response.status === 419 || msg.includes("csrf") || msg.includes("xsrf");

      if (isCsrf && !config.__retried) {
        config.__retried = true;
        await ensureCsrf(true); // refresh cookie
        return instance(config);
      }
      throw error;
    }
  );
}
addCsrfRetry(axiosBase);
addCsrfRetry(axiosClient);

// --- Helpers ---
export async function login({ email, password }) {
  await ensureCsrf();
  return axiosBase.post("/connexion", { email, password });
}

export async function logout() {
  await ensureCsrf();
  return axiosBase.post("/deconnexion");
}

export function me() {
  return axiosClient.get("/me");
}

export default axiosClient;
