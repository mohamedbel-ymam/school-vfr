// src/api/axios.js
import axios from "axios";

function resolveBaseUrl() {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "";
  if (raw) return raw.replace(/\/+$/, "");
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal ? "http://localhost:8000" : "https://api.takwaetablissement.com";
}

const API_BASE = resolveBaseUrl();

export const axiosBase = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // ✅ send/receive cookies
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

export const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Ensure CSRF cookie exists (sets XSRF-TOKEN + session cookie)
export async function ensureCsrf() {
  await axiosBase.get("/sanctum/csrf-cookie");
}

// Auto-retry once on 419 (expired CSRF), then replay the original request
let retrying = false;
axiosClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config || {};
    if (error?.response?.status === 419 && !retrying) {
      retrying = true;
      try {
        await ensureCsrf();
        return await axiosClient.request(cfg);
      } finally {
        retrying = false;
      }
    }
    throw error;
  }
);

// Convenience helpers
export async function login({ email, password }) {
  await ensureCsrf();
  return axiosBase.post("/connexion", { email, password });
}

export async function logout() {
  await ensureCsrf();
  return axiosBase.post("/deconnexion"); // or "/déconnexion" if that’s your route
}

export function me() {
  return axiosClient.get("/me");
}

export default axiosClient;
