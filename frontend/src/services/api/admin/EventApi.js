// src/services/api/admin/EventApi.js
import { axiosClient, ensureCsrf } from "../../../api/axios";

/* ---------------- helpers ---------------- */

const MAP_TEMPLATE = {
  general: "GENERAL",
  exam: "EXAM",
  meeting: "MEETING",
  holiday: "HOLIDAY",
  workshop: "WORKSHOP",
  announcement: "ANNOUNCEMENT",
  emergency: "EMERGENCY",
};
const isDataUrl = (v) =>
  typeof v === "string" &&
  /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,/i.test(v);

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
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/** Accept many front-end field names and coerce to backend keys */
function resolveEventValues(values = {}) {
  const v = values || {};
  const title =
    v.title ?? v.titre ?? v.name ?? v.label ?? ""; // <- aliases

  const startsRaw =
    v.starts_at ?? v.start_at ?? v.startAt ?? v.startsAt ??
    v.start ?? v.debut ?? v.when ?? v.date ?? "";

  const endsRaw =
    v.ends_at ?? v.end_at ?? v.endAt ?? v.endsAt ?? v.end ?? v.fin ?? "";

  const template = normalizeTemplate(v.template ?? v.type ?? v.category);

  return {
    title: String(title).trim(),
    template,
    starts_at: toLocalNoSeconds(startsRaw),
    ends_at: endsRaw ? toLocalNoSeconds(endsRaw) : "",
    location: v.location ?? v.lieu ?? "",
    description: v.description ?? v.desc ?? "",
    data: v.data ?? null,
    image: v.image ?? v.file ?? null,
    remove_image: v.remove_image ?? v.removeImage ?? undefined,
  };
}

async function toFormData(values = {}) {
  const r = resolveEventValues(values);
  const fd = new FormData();

  // required
  fd.append("title", r.title);
  fd.append("template", r.template);

  if (r.starts_at) fd.append("starts_at", r.starts_at);
  if (r.ends_at)   fd.append("ends_at", r.ends_at);

  if (r.location)    fd.append("location", r.location);
  if (r.description) fd.append("description", r.description);

  if (r.data !== null && r.data !== undefined) {
    fd.append("data", typeof r.data === "string" ? r.data : JSON.stringify(r.data));
  }

  const img = r.image;
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

  if (r.remove_image !== undefined) {
    fd.append("remove_image", r.remove_image ? "1" : "0");
  }

  return fd;
}

function log422(e) {
  const errs = e?.response?.data?.errors;
  if (errs && typeof errs === "object") {
    const rows = Object.entries(errs).map(([field, msgs]) => ({
      field, message: Array.isArray(msgs) ? msgs.join(" | ") : String(msgs),
    }));
    // eslint-disable-next-line no-console
    console.table(rows);
  }
}

/* ---------------- API ---------------- */

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

    // Quick client-side guard: surface the exact missing fields before hitting 422
    const t = fd.get("title");
    const s = fd.get("starts_at");
    if (!t || !String(t).trim()) throw new Error("Le titre est requis (title).");
    if (!s || !String(s).trim()) throw new Error("La date de début est requise (starts_at).");

    await ensureCsrf();
    try {
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
};

export default AdminEventApi;
