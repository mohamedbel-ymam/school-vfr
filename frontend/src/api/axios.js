// src/api/axios.js
import axios from "axios";

function base() {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "";
  if (raw) return raw.replace(/\/+$/, "");
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  return isLocal ? "http://localhost:8000" : "https://api.takwaetablissement.com";
}

const API_BASE = base();

export const axiosBase = axios.create({
  baseURL: API_BASE,              // e.g. https://api.takwa...
  withCredentials: true,          // send cookies
  xsrfCookieName: "XSRF-TOKEN",   // Sanctum cookie name
  xsrfHeaderName: "X-XSRF-TOKEN", // header Laravel checks
  headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
});

export const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`,     // for /api/* authenticated endpoints
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
});

// Ensure the CSRF cookie exists
export async function ensureCsrf() {
  await axiosBase.get("/sanctum/csrf-cookie");
}

// Optional: auto-retry once on 419
let retrying = false;
axiosClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 419 && !retrying) {
      retrying = true;
      try {
        await ensureCsrf();
        return await axiosClient.request(err.config);
      } finally {
        retrying = false;
      }
    }
    throw err;
  }
);

// Manual helpers
function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^|; )" + name.replace(/([$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export async function login({ email, password }) {
  // 1) Get XSRF-TOKEN cookie
  await ensureCsrf();

  // 2) (Belt & suspenders) force header from cookie
  const token = getCookie("XSRF-TOKEN");
  return axiosBase.post(
    "/connexion",
    { email, password },
    token
      ? { headers: { "X-XSRF-TOKEN": token } }
      : undefined
  );
}

export async function logout() {
  await ensureCsrf();
  return axiosBase.post("/deconnexion");
}

export function me() {
  return axiosClient.get("/me");
}
