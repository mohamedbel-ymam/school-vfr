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

// Helpers
function getCookie(name) {
  const m = document.cookie.match(
    new RegExp(
      `(^|; )${name.replace(/([$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`
    )
  );
  return m ? decodeURIComponent(m[2]) : null;
}

export async function ensureCsrf() {
  await axiosBase.get("/sanctum/csrf-cookie");
}

// 🔒 Auto-ensure CSRF for mutating requests + set header if missing
let csrfBootstrapped = false;
axiosClient.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method);

  if (needsCsrf) {
    if (!csrfBootstrapped) {
      await ensureCsrf();
      csrfBootstrapped = true;
    }
    // if header not set by axios automatically, force it from cookie
    const token = getCookie("XSRF-TOKEN");
    if (token && !config.headers?.["X-XSRF-TOKEN"]) {
      config.headers = { ...(config.headers || {}), "X-XSRF-TOKEN": token };
    }
  }
  return config;
});

// ♻️ Auto-retry once on 419
let retrying = false;
axiosClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 419 && !retrying) {
      retrying = true;
      try {
        await ensureCsrf();
        const token = getCookie("XSRF-TOKEN");
        if (token) {
          err.config.headers = {
            ...(err.config.headers || {}),
            "X-XSRF-TOKEN": token,
          };
        }
        return await axiosClient.request(err.config);
      } finally {
        retrying = false;
      }
    }
    // Optional: handle 401 → force re-login flow
    // if (err?.response?.status === 401) { ... }
    throw err;
  }
);

// Manual auth helpers
export async function login({ email, password }) {
  await ensureCsrf();
  const token = getCookie("XSRF-TOKEN");
  return axiosBase.post(
    "/connexion",
    { email, password },
    token ? { headers: { "X-XSRF-TOKEN": token } } : undefined
  );
}

export async function logout() {
  await ensureCsrf();
  return axiosBase.post("/deconnexion");
}

export function me() {
  return axiosClient.get("/me");
}
