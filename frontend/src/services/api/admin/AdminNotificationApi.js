// src/services/api/admin/AdminNotificationApi.js
// ADMIN endpoints ONLY
import { axiosClient } from "../../../api/axios";

const AdminNotificationApi = {
  async list(params = {}) {
    return axiosClient.get("/admin/notifications", { params });
  },

  async destroy(broadcastId) {
    return axiosClient.delete(`/admin/notifications/${broadcastId}`);
  },
  async delete(id) {
    return this.destroy(id);
  },
  async remove(id) {
    return this.destroy(id);
  },

  async broadcast(formValues) {
    // keep your existing normalize on the page or re-import it if you had one
    return axiosClient.post("/admin/notifications/broadcast", {
      payload: formValues,
    });
  },
};

export default AdminNotificationApi;
export { AdminNotificationApi };
