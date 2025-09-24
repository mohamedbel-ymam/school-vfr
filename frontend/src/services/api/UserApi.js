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
  // Generic
  list(params = {}) {
    // GET /api/admin/users
    return axiosClient.get("/admin/users", { params });
  },

  create(payload) {
    // POST /api/admin/users  (UserController@store)
    return axiosClient.post("/admin/users", payload);
  },

  update(id, payload) {
    // PUT /api/admin/users/{id} (UserController@update)
    return axiosClient.put(`/admin/users/${id}`, payload);
  },

  show(id) {
    return axiosClient.get(`/admin/users/${id}`);
  },

  // Role-scoped helpers (server accepts FR/EN; we send EN canonical)
  async students({ q = "", per_page = 1000 } = {}) {
    const resp = await axiosClient.get("/admin/users", {
      params: { role: "student", per_page, ...(q ? { q } : {}) },
    });
    // keep original response for callers that need status/data
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
