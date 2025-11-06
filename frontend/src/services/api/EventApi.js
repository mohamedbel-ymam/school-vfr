// src/services/api/admin/EventApi.js
import { axiosClient } from "../../api/axios";

/* ----------------- helpers ----------------- */
function isDataUrl(v) { return typeof v === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(v); }

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Build FormData from a plain object.
 * - files: accepts File/Blob (appends directly) and dataURL strings (converts)
 * - arrays/objects: stringifies unless you want indexed fields
 * - duplicates common aliases to satisfy French/English backends
 */
async function buildEventFormData(payload = {}) {
  const fd = new FormData();

  const {
    id,
    title,          // string
    template,       // string
    starts_at,      // date string
    ends_at,        // date string | null
    location,       // string | null
    description,    // string | null
    image,          // File | Blob | dataURL string
    image_url,      // string (when not uploading)
    data,           // object (CTA etc.)
    ...rest
  } = payload || {};

  // Strings (duplicates for 'titre' just in case)
  if (title != null)       { fd.append("title", String(title)); fd.append("titre", String(title)); }
  if (template != null)    { fd.append("template", String(template)); }
  if (location != null)    { fd.append("location", String(location)); fd.append("lieu", String(location)); }
  if (description != null) { fd.append("description", String(description)); }

  // Dates: ensure ISO 8601 (many validators require this)
  if (starts_at) {
    const iso = new Date(starts_at).toISOString();
    fd.append("starts_at", iso);
    fd.append("debut", iso);
  }
  if (ends_at) {
    const iso = new Date(ends_at).toISOString();
    fd.append("ends_at", iso);
    fd.append("fin", iso);
  }

  // data (JSON for extra fields like CTA)
  if (data != null) {
    fd.append("data", JSON.stringify(data));
    fd.append("meta", JSON.stringify(data)); // alias some APIs use
  }

  // Remaining scalar fields
  for (const [k, v] of Object.entries(rest)) {
    if (v == null) continue;
    if (typeof v === "object") { fd.append(k, JSON.stringify(v)); }
    else { fd.append(k, String(v)); }
  }

  // Image:
  if (image) {
    if (image instanceof Blob || (typeof File !== "undefined" && image instanceof File)) {
      const name = image.name || "event.png";
      fd.append("image", image, name);      // common
      fd.append("banner", image, name);     // alias
      fd.append("photo", image, name);      // alias
    } else if (isDataUrl(image)) {
      const blob = await dataUrlToBlob(image);
      fd.append("image", blob, "event.png");
      fd.append("banner", blob, "event.png");
      fd.append("photo", blob, "event.png");
    }
  } else if (image_url) {
    // Some backends accept setting URL directly (no upload)
    fd.append("image_url", image_url);
  }

  return fd;
}

/* --------------- API (admin) --------------- */
export const AdminEventApi = {
  // Note: your server uses French resource: /admin/evenements
  list(params = {}) { return axiosClient.get("/admin/evenements", { params }); },

  async create(payload) {
    // if any image present ⇒ send multipart; else JSON
    const hasImage = !!(payload?.image || payload?.image_url);
    if (hasImage) {
      const fd = await buildEventFormData(payload);
      return axiosClient.post("/admin/evenements", fd, { headers: { "Content-Type": "multipart/form-data" } });
    }
    // ensure ISO strings for dates in JSON body
    const p = { ...payload };
    if (p.starts_at) p.starts_at = new Date(p.starts_at).toISOString();
    if (p.ends_at)   p.ends_at   = new Date(p.ends_at).toISOString();
    if (p.data && typeof p.data === "object") p.data = p.data; // JSON okay
    return axiosClient.post("/admin/evenements", p);
  },

  async update(id, payload) {
    const hasImage = !!(payload?.image || payload?.image_url);
    if (hasImage) {
      const fd = await buildEventFormData(payload);
      // most Laravel controllers accept PUT multipart, otherwise POST to a dedicated route
      return axiosClient.post(`/admin/evenements/${id}?_method=PUT`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    }
    const p = { ...payload };
    if (p.starts_at) p.starts_at = new Date(p.starts_at).toISOString();
    if (p.ends_at)   p.ends_at   = new Date(p.ends_at).toISOString();
    return axiosClient.put(`/admin/evenements/${id}`, p);
  },

  remove(id) { return axiosClient.delete(`/admin/evenements/${id}`); },

  // If you want a dedicated image endpoint, keep this convenience too:
  async setImage(id, dataUrlOrFile) {
    const fd = new FormData();
    if (isDataUrl(dataUrlOrFile)) {
      const blob = await dataUrlToBlob(dataUrlOrFile);
      fd.append("image", blob, `event-${id}.png`);
    } else if (dataUrlOrFile instanceof Blob) {
      fd.append("image", dataUrlOrFile, `event-${id}.png`);
    } else {
      // last resort: maybe backend accepts URL
      fd.append("image_url", String(dataUrlOrFile));
    }
    // try common routes
    const tries = [
      () => axiosClient.post(`/admin/evenements/${id}/image`, fd),
      () => axiosClient.post(`/admin/evenements/${id}/upload-image`, fd),
      () => axiosClient.post(`/admin/evenements/${id}?_method=PUT`, fd),
      () => axiosClient.put(`/admin/evenements/${id}`, { image_url: dataUrlOrFile }),
    ];
    let lastErr;
    for (const t of tries) {
      try { return await t(); } catch (e) {
        const st = e?.response?.status;
        if (![400,401,403,404,405,409,422].includes(st)) throw e;
        lastErr = e;
      }
    }
    throw lastErr || new Error("setImage failed");
  },
};
