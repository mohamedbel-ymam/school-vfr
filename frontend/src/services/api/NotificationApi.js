// src/services/api/NotificationApi.js
// USER inbox ONLY
import { axiosClient } from "../../api/axios";

const NotificationApi = {
  // list my notifications
  async list(params = {}) {
    return axiosClient.get("/notifications", { params });
  },
  async index(params = {}) {
    return this.list(params);
  },
  async all(params = {}) {
    return this.list(params);
  },

  async markRead(id) {
    return axiosClient.post(`/notifications/${id}/read`);
  },

  async markAllRead() {
    return axiosClient.post("/notifications/read-all");
  },

  // optional if you exposed DELETE for a single notification in routes/api.php
  async destroy(id) {
    return axiosClient.delete(`/notifications/${id}`);
  },
  async delete(id) {
    return this.destroy(id);
  },
  async remove(id) {
    return this.destroy(id);
  },
};

export default NotificationApi;
export { NotificationApi };
