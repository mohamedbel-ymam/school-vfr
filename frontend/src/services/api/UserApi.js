// services/Api/UserApi.js
import { axiosClient } from "../../api/axios";

// Helpers to normalize API payloads to a simple array
function asArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.data?.data)) return resp.data.data;
  return [];
}

const UserApi = {
  // --- Basic CRUD (admin) ---
  list(params = {}) {
    // GET /api/admin/users
    return axiosClient.get("/admin/users", { params });
  },

  create(payload) {
    // POST /api/admin/users
    return axiosClient.post("/admin/users", payload);
  },

  update(id, payload) {
    // PUT /api/admin/users/{id}
    return axiosClient.put(`/admin/users/${id}`, payload);
  },

  show(id) {
    // GET /api/admin/users/{id}
    return axiosClient.get(`/admin/users/${id}`);
  },

  // ✅ shim used by SendNotification.jsx
  // fetch a big page of users (the component will unwrap data?.data || data)
  all() {
    return axiosClient.get("/admin/users", { params: { per_page: 1000 } });
  },

  // --- Role-scoped helpers (optional convenience) ---
  async students({ q = "", per_page = 1000 } = {}) {
    const resp = await axiosClient.get("/admin/users", {
      params: { role: "student", per_page, ...(q ? { q } : {}) },
    });
    resp.list = asArray(resp);
    return resp;
  },

  async teachers({ q = "", per_page = 1000 } = {}) {
    const resp = await axiosClient.get("/admin/users", {
      params: { role: "teacher", per_page, ...(q ? { q } : {}) },
    });
    resp.list = asArray(resp);
    return resp;
  },

  async parents({ q = "", per_page = 1000 } = {}) {
    const resp = await axiosClient.get("/admin/users", {
      params: { role: "parent", per_page, ...(q ? { q } : {}) },
    });
    resp.list = asArray(resp);
    return resp;
  },
};

export default UserApi;
export { UserApi };
