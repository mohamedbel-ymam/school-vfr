// ADMIN endpoints ONLY
import { axiosClient, ensureCsrf } from "../../../api/axios";

const AdminNotificationApi = {
  async list(params = {}) {
    return await axiosClient.get("/admin/notifications", { params });
  },

  async destroy(broadcastId) {
    await ensureCsrf();
    return await axiosClient.delete(`/admin/notifications/${broadcastId}`);
  },
  async delete(id){ return this.destroy(id); },
  async remove(id){ return this.destroy(id); },

  async broadcast(formValues) {
    // keep your existing normalize on the page or re-import it if you had one
    await ensureCsrf();
    return await axiosClient.post("/admin/notifications/broadcast", { payload: formValues });
  },
};

export default AdminNotificationApi;
export { AdminNotificationApi };
