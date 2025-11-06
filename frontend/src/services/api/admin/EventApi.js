// src/services/api/admin/EventApi.js
import { axiosClient, ensureCsrf } from "../../../api/axios";

/* ---------------- helpers ---------------- */

// Map to your allowed enum (uppercase)
function normalizeTemplate(t) {
  const map = {
    general: "GENERAL",
    exam: "EXAM",
    meeting: "MEETING",
    holiday: "HOLIDAY",
    workshop: "WORKSHOP",
    announcement: "ANNOUNCEMENT",
    emergency: "EMERGENCY",
  };
  const k = String(t || "").trim().toLowerCase();
  return map[k] || "GENERAL";
}

// Your backend normalizer expects "YYYY-MM-DDTHH:MM" (no seconds)
function toLocalNoSeconds(val) {
  if (!val) return "";
  const d = (val instanceof Date) ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isDataUrl = (v) =>
  typeof v === "string" &&
  /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,/i.test(v);

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Build FormData exactly how your AdminEventController validates it.
 * - Always multipart (safe even without file).
 * - dates as "YYYY-MM-DDTHH:MM" so your normalizeDate() accepts them.
 * - image field name = "image".
 * - data is JSON string.
 * - supports File, FileList, Blob, dataURL; ignores image_url on create/update.
 */
async function toFormData(values = {}) {
  const fd = new FormData();

  // Scalars
  if (values.title != null)       fd.append("title", String(values.title));
  if (values.template != null)    fd.append("template", normalizeTemplate(values.template));

  if (values.starts_at) fd.append("starts_at", toLocalNoSeconds(values.starts_at));
  if (values.ends_at)   fd.append("ends_at",   toLocalNoSeconds(values.ends_at));

  if (values.location != null)    fd.append("location", String(values.location));
  if (values.description != null) fd.append("description", String(values.description));

  // data (JSON/string)
  const dataPayload = values.data ?? null;
  if (dataPayload !== null && dataPayload !== undefined) {
    fd.append("data", typeof dataPayload === "string" ? dataPayload : JSON.stringify(dataPayload));
  }

  // Image (File | FileList | Blob | dataURL)
  const img = values.image ?? values.file ?? null;
  if (img) {
    if (img instanceof Blob || (typeof File !== "undefined" && img instanceof File)) {
      fd.append("image", img, img.name || "event.png");
    } else if (Array.isArray(img) || (typeof FileList !== "undefined" && img instanceof FileList)) {
      const f = img[0];
      if (f) fd.append("image", f, f.name || "event.png");
    } else if (isDataUrl(img)) {
      const blob = await dataUrlToBlob(img);
      fd.append("image", blob, "event.png");
    }
  }

  // remove_image flag (update only)
  if (values.remove_image !== undefined) {
    fd.append("remove_image", values.remove_image ? "1" : "0");
  }

  return fd;
}

/* ---------------- API ---------------- */

export const AdminEventApi = {
  // French admin routes per your routes/api.php
  async list(params = {}) {
    const r = await axiosClient.get("/admin/evenements", { params });
    return r.data; // {data, meta}
  },

  async show(id) {
    const r = await axiosClient.get(`/admin/evenements/${id}`);
    return r.data; // {data: event}
  },

  // Always multipart (safe, backend accepts null image)
  async create(values) {
    const fd = await toFormData(values);
    await ensureCsrf();
    const r = await axiosClient.post("/admin/evenements", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },

  // Multipart + method override for Laravel PUT with files
  async update(id, values) {
    const fd = await toFormData(values);
    fd.append("_method", "PUT");
    await ensureCsrf();
    const r = await axiosClient.post(`/admin/evenements/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },

  async remove(id) {
    await ensureCsrf();
    const r = await axiosClient.delete(`/admin/evenements/${id}`);
    return r.data; // may be empty (204)
  },

  /**
   * Optional helper to set/replace image after create.
   * Tries multipart to the same update endpoint (PUT override).
   */
  async setImage(id, fileOrDataUrl) {
    const fd = new FormData();
    if (fileOrDataUrl instanceof Blob || (typeof File !== "undefined" && fileOrDataUrl instanceof File)) {
      fd.append("image", fileOrDataUrl, fileOrDataUrl.name || `event-${id}.png`);
    } else if (isDataUrl(fileOrDataUrl)) {
      const blob = await dataUrlToBlob(fileOrDataUrl);
      fd.append("image", blob, `event-${id}.png`);
    } else {
      // If you need to support image_url directly, add it in your controller first.
      throw new Error("setImage expects a File/Blob or dataURL");
    }
    fd.append("_method", "PUT");
    await ensureCsrf();
    const r = await axiosClient.post(`/admin/evenements/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
};

export default AdminEventApi;
