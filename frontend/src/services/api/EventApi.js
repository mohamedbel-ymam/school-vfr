// src/services/api/EventApi.js
import { axiosClient } from "../../api/axios";

/* helpers */
function asArray(resp) {
  if (!resp) return [];
  const d = resp.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}
function metaOf(resp) {
  const d = resp?.data;
  return d?.meta || null;
}

export const EventApi = {
  // Public/reader list (your routes expose /evenements publicly)
  async list(params = {}) {
    const res = await axiosClient.get("/evenements", { params });
    return { data: asArray(res), meta: metaOf(res) };
  },

  async show(id) {
    const res = await axiosClient.get(`/evenements/${id}`);
    // backend returns { data: event }
    return res?.data?.data ?? res?.data ?? null;
  },

  // Convenience
  async upcoming(params = {}) {
    // let backend filter via from/to if you add it, otherwise just call list
    return this.list(params);
  },
};

export default EventApi;
