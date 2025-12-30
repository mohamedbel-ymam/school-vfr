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

  if (raw) return raw.replace(/\/+$/, "");

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal
    ? "http://localhost:8000"
    : "https://api.takwaetablissement.com";
}

const API_BASE = resolveBaseURL();

/* -------------------------------------------------------------------------- */
/* Axios instances                                                            */
/* -------------------------------------------------------------------------- */

// 👉 For web routes (/connexion, /deconnexion, /sanctum/csrf-cookie)
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

// 👉 For API routes (/api/*)
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
/* CSRF helper                                                                */
/* -------------------------------------------------------------------------- */

export async function ensureCsrf() {
  // ⚠️ DO NOT add headers here
  // Sanctum needs a clean GET
  await axiosBase.get("/sanctum/csrf-cookie");
}

/* -------------------------------------------------------------------------- */
/* ❌ IMPORTANT: WHAT WE DO NOT DO ANYMORE                                    */
/* -------------------------------------------------------------------------- */

// ❌ NO request interceptor calling ensureCsrf
// ❌ NO automatic 419 retry
// ❌ NO login/logout helpers here
//
// All auth logic is handled in AuthContext only.
// This avoids:
// - infinite loops
// - double CSRF headers
// - nginx + Laravel CORS conflicts
