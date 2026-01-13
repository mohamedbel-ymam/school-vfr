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
/* Axios defaults (🔥 CRITICAL)                                                */
/* -------------------------------------------------------------------------- */

// 🔥 Force XSRF on cross-subdomain
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = "XSRF-TOKEN";
axios.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

/* -------------------------------------------------------------------------- */
/* Axios client                                                               */
/* -------------------------------------------------------------------------- */

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
/* CSRF cookie (REQUIRED ONCE PER SESSION)                                    */
/* -------------------------------------------------------------------------- */

export async function getCsrfCookie() {
  return axios.get(`${API_BASE}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

export async function login({ email, password }) {
  // 🔥 MUST be first
  await getCsrfCookie();

  // 🔥 X-XSRF-TOKEN will now be attached
  return axiosClient.post("/connexion", { email, password });
}

export function logout() {
  return axiosClient.post("/deconnexion");
}

export function me() {
  return axiosClient.get("/me");
}
