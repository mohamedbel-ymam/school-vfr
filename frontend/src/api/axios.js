import axios from "axios";

/* -------------------------------------------------------------------------- */
/* Base URL                                                                   */
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

  if (isLocal) {
    return "http://localhost:8000";
  }

  // En production sur Render (même domaine pour le Front et l'API)
  return "https://school-vfr.onrender.com";
}

const API_BASE = resolveBaseURL();

/* -------------------------------------------------------------------------- */
/* Axios client (Sanctum SPA)                                                 */
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
/* Optional response interceptor                                              */
/* -------------------------------------------------------------------------- */

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
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