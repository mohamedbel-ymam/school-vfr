// frontend/src/services/Api/AdminApi.js
import {axiosClient} from "../../api/axios"; // <- your configured instance

const AdminApi = {
  listAdmins(params = {}) {
    return axiosClient.get("/admin/admins", { params });
  },
  listCandidates(params = {}) {
    return axiosClient.get("/admin/admins/candidates", { params });
  },
  assign(userId) {
    return axiosClient.post(`/admin/admins/${userId}/assign`);
  },
  revoke(userId) {
    return axiosClient.post(`/admin/admins/${userId}/revoke`);
  },
  createAdmin(payload) {
    return axiosClient.post("/admin/users", payload);
  },
  updateAdmin(userId, payload) {
    return axiosClient.put(`/admin/users/${userId}`, payload);
  },
};

export default AdminApi;
