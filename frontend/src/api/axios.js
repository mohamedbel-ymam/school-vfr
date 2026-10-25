// src/api/axios.js
import axios from "axios";

/* -------------------------------------------------------------------------- */
/* Base URL                                                                    */
/* -------------------------------------------------------------------------- */

function resolveBaseURL() {
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
    : "https://school-vfr.render.com";
}

const API_BASE = resolveBaseURL();

/* -------------------------------------------------------------------------- */
/* Axios client (Sanctum SPA – NO CSRF)                                        */
/* -------------------------------------------------------------------------- */

export const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // 🔑 REQUIRED for Sanctum session cookies
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

/* -------------------------------------------------------------------------- */
/* Optional response interceptor                                               */
/* -------------------------------------------------------------------------- */

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optional: global auth handling
    if (error?.response?.status === 401) {
      // not authenticated
    }
    if (error?.response?.status === 403) {
      // forbidden
    }
    return Promise.reject(error);
  }
);

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * LOGIN
 * POST /api/connexion
 */
export function login({ login, password }) {
  return axiosClient.post("/connexion", { login, password });
}

/**
 * LOGOUT
 * POST /api/deconnexion
 */
export function logout() {
  return axiosClient.post("/deconnexion");
}

/**
 * CURRENT USER
 * GET /api/me
 */
export function me() {
  return axiosClient.get("/me");
}
