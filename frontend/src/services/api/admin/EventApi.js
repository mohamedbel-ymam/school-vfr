// src/services/api/admin/EventApi.js
import { axiosClient, ensureCsrf } from "../../../api/axios";

/* ---------- helpers ---------- */
const MAP_TEMPLATE = {
  general: "GENERAL",
  exam: "EXAM",
  meeting: "MEETING",
  holiday: "HOLIDAY",
  workshop: "WORKSHOP",
  announcement: "ANNOUNCEMENT",
  emergency: "EMERGENCY",
};
function normalizeTemplate(t) {
  return MAP_TEMPLATE[String(t || "").toLowerCase()] || "GENERAL";
}
function toLocalNoSeconds(val) {
  if (!val) return "";
  const d = (val instanceof Date) ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const isDataUrl = (v) =>
  typeof v === "string" &&
  /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,/i.test(v);

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function toFormData(values = {}) {
  const fd = new FormData();

  // required / validated fields
  fd.append("title", String(values.title || "").trim());
  fd.append("template", normalizeTemplate(values.template));

  if (values.starts_at) fd.append("starts_at", toLocalNoSeconds(values.starts_at));
  if (values.ends_at)   fd.append("ends_at",   toLocalNoSeconds(values.ends_at));

  if (values.location != null)    fd.append("location", String(values.location));
  if (values.description != null) fd.append("description", String(values.description));

  // `data` may be object or string; controller accepts string/array then decodes
  if (values.data !== undefined && values.data !== null) {
    fd.append("data", typeof values.data === "string" ? values.data : JSON.stringify(values.data));
  }

  // image: accept File, FileList, Blob, dataURL
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

  if (values.remove_image !== undefined) {
    fd.append("remove_image", values.remove_image ? "1" : "0");
  }

  return fd;
}

// DEV: print FormData pairs to spot issues quickly
async function debugFormData(fd) {
  const rows = [];
  for (const [k, v] of fd.entries()) {
    rows.push({ key: k, value: v instanceof Blob ? `[Blob ${v.type} ${v.size}B]` : String(v).slice(0, 120) });
  }
  // eslint-disable-next-line no-console
  console.table(rows);
}

function log422(e) {
  const errs = e?.response?.data?.errors;
  if (errs && typeof errs === "object") {
    const rows = Object.entries(errs).map(([field, msgs]) => ({
      field, message: Array.isArray(msgs) ? msgs.join(" | ") : String(msgs),
    }));
    // eslint-disable-next-line no-console
    console.table(rows);
  } else {
    // eslint-disable-next-line no-console
    console.error("422 response:", e?.response?.data || e?.message);
  }
}

/* ---------- API ---------- */
export const AdminEventApi = {
  async list(params = {}) {
    const r = await axiosClient.get("/admin/evenements", { params });
    return r.data; // {data, meta}
  },

  async show(id) {
    const r = await axiosClient.get(`/admin/evenements/${id}`);
    return r.data;
  },

  async create(values) {
    const fd = await toFormData(values);
    await ensureCsrf();
    try {
      // DEV: uncomment to inspect what you send
      // await debugFormData(fd);
      const r = await axiosClient.post("/admin/evenements", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data;
    } catch (e) {
      if (e?.response?.status === 422) log422(e);
      throw e;
    }
  },

  async update(id, values) {
    const fd = await toFormData(values);
    fd.append("_method", "PUT");
    await ensureCsrf();
    try {
      // await debugFormData(fd);
      const r = await axiosClient.post(`/admin/evenements/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data;
    } catch (e) {
      if (e?.response?.status === 422) log422(e);
      throw e;
    }
  },

  async remove(id) {
    await ensureCsrf();
    const r = await axiosClient.delete(`/admin/evenements/${id}`);
    return r.data;
  },

  async setImage(id, fileOrDataUrl) {
    const fd = new FormData();
    if (fileOrDataUrl instanceof Blob || (typeof File !== "undefined" && fileOrDataUrl instanceof File)) {
      fd.append("image", fileOrDataUrl, fileOrDataUrl.name || `event-${id}.png`);
    } else if (isDataUrl(fileOrDataUrl)) {
      const blob = await dataUrlToBlob(fileOrDataUrl);
      fd.append("image", blob, `event-${id}.png`);
    } else {
      throw new Error("setImage expects a File/Blob or dataURL");
    }
    fd.append("_method", "PUT");
    await ensureCsrf();
    try {
      const r = await axiosClient.post(`/admin/evenements/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data;
    } catch (e) {
      if (e?.response?.status === 422) log422(e);
      throw e;
    }
  },
};

export default AdminEventApi;
