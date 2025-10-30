// USER inbox ONLY
import { axiosClient, ensureCsrf } from "../../api/axios";

const NotificationApi = {
  // list my notifications
  async list(params = {}) {
    return await axiosClient.get("/notifications", { params });
  },
  async index(params = {}) { return this.list(params); },
  async all(params = {})   { return this.list(params); },

  async markRead(id) {
    await ensureCsrf();
    return await axiosClient.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await ensureCsrf();
    return await axiosClient.post("/notifications/read-all");
  },

  // optional if you exposed DELETE for a single notification in routes/api.php
  async destroy(id) {
    await ensureCsrf();
    return await axiosClient.delete(`/notifications/${id}`);
  },
  async delete(id){ return this.destroy(id); },
  async remove(id){ return this.destroy(id); },
};

export default NotificationApi;
export { NotificationApi };
