// src/api/axios.js
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

  return isLocal
    ? "http://localhost:8000"
    : "https://api.takwaetablissement.com";
}

const API_BASE = resolveBaseURL();

/* -------------------------------------------------------------------------- */
/* Axios instance (Sanctum SPA – CSRF REQUIRED)                               */
/* -------------------------------------------------------------------------- */

export const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // 🔑 cookies for Sanctum
  xsrfCookieName: "XSRF-TOKEN",     // 🔥 REQUIRED
  xsrfHeaderName: "X-XSRF-TOKEN",   // 🔥 REQUIRED
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

/* -------------------------------------------------------------------------- */
/* CSRF cookie (Sanctum requirement)                                          */
/* -------------------------------------------------------------------------- */

export function getCsrfCookie() {
  return axios.get(`${API_BASE}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * LOGIN
 * POST /api/connexion
 */
export async function login({ email, password }) {
  // 🔥 MUST be called once before login
  await getCsrfCookie();
  return axiosClient.post("/connexion", { email, password });
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
