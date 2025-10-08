// services/api/EventApi.js
import { axiosClient } from "../../api/axios";

/**
 * Public Events API (requires Sanctum auth + role).
 * - list(params): returns the backend payload { data: Event[], meta: { ... } }
 * - show(id):     returns the backend payload { data: Event }
 */
export const EventApi = {
  async list(params = {}) {
    // Keep the shape the same so existing code using res.data still works
    const { data } = await axiosClient.get("/evenements", {
      params: { per_page: 50, ...params },
    });
    return data; // { data: [...], meta: {...} }
  },

  async show(id) {
    const { data } = await axiosClient.get(`/evenements/${id}`);
    return data; // { data: {...} }
  },
};

export default EventApi;
