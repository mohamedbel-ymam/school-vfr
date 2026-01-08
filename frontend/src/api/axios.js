// src/api/axios.js
import axios from "axios";

/* -------------------------------------------------------------------------- */
/* Base URL                                                                   */
/* -------------------------------------------------------------------------- */

function base() {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "";

  if (raw) {
    return raw.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal
    ? "http://localhost:8000"
    : "https://api.takwaetablissement.com";
}

const API_BASE = base();

/* -------------------------------------------------------------------------- */
/* Axios instances                                                            */
/* -------------------------------------------------------------------------- */

/**
 * axiosBase
 * - Used ONLY for:
 *   - /sanctum/csrf-cookie
 *   - public endpoints (no auth)
 */
export const axiosBase = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

/**
 * axiosClient
 * - Used for ALL authenticated SPA routes
 * - ⚠️ NO /api PREFIX
 */
export const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`, 
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

/* -------------------------------------------------------------------------- */
/* CSRF                                                                       */
/* -------------------------------------------------------------------------- */

export async function ensureCsrf() {
  // 🔒 MUST use axiosBase (NO /api prefix)
  return axiosBase.get("/sanctum/csrf-cookie");
}


/* -------------------------------------------------------------------------- */
/* Response interceptor                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Retry ONCE on 419 (CSRF expired)
 */
let retrying = false;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 419 && !retrying) {
      retrying = true;
      try {
        await ensureCsrf();
        return await axiosClient.request(error.config);
      } finally {
        retrying = false;
      }
    }
    throw error;
  }
);

/* -------------------------------------------------------------------------- */
/* Auth helpers (SPA ROUTES)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * LOGIN
 * POST /connexion
 */
export async function login({ email, password }) {
  await ensureCsrf();
  return axiosClient.post("/connexion", { email, password });
}

/**
 * LOGOUT
 * POST /deconnexion
 */
export async function logout() {
  return axiosClient.post("/deconnexion");
}

/**
 * CURRENT USER
 * GET /me
 */
export function me() {
  return axiosClient.get("/me");
}
