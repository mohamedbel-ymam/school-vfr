// src/services/api/admin/EventApi.js
import { axiosClient } from "../../api/axios";

export const AdminEventApi = {
  list(params = {}) { return axiosClient.get("/admin/events", { params }); },
  create(payload)   { return axiosClient.post("/admin/events", payload); },
  update(id, p)     { return axiosClient.put(`/admin/events/${id}`, p); },
  remove(id)        { return axiosClient.delete(`/admin/events/${id}`); },

  // NEW: try to persist image (works with many backends)
  async setImage(id, dataUrl) {
    // 1) Try “file upload” style (multipart)
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append("image", blob, `event-${id}.png`);

    const soft = (e) => [400,401,403,404,405,409,422].includes(e?.response?.status);

    // attempt candidates
    const attempts = [
      () => axiosClient.post(`/admin/events/${id}/image`, fd),
      () => axiosClient.post(`/admin/events/${id}/upload-image`, fd),
      () => axiosClient.put(`/admin/events/${id}/image`, fd),
      // 2) Fallback: just PUT JSON image_url (if your server accepts data URLs)
      () => axiosClient.put(`/admin/events/${id}`, { image_url: dataUrl }),
    ];

    let lastErr;
    for (const fn of attempts) {
      try { return await fn(); }
      catch (e) { if (!soft(e)) throw e; lastErr = e; }
    }
    throw lastErr || new Error("setImage failed");
  },
};
