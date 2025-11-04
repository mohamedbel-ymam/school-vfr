// services/Api/UserApi.js
import { axiosClient } from "../../api/axios";

/* ----------------------------- helpers ----------------------------- */

// Normalize API payloads to a simple array
function asArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.data?.data)) return resp.data.data;
  return [];
}

// Errors we should ignore silently for "best-effort" calls
function isSoftError(e) {
  const st = e?.response?.status;
  return [403, 404, 405].includes(st);
}

// Run a list of axios calls until one succeeds; throw only on hard errors
async function tryCalls(calls) {
  let lastErr;
  for (const fn of calls) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isSoftError(e)) throw e; // bubble up 4xx/5xx except soft ones
    }
  }
  if (lastErr) throw lastErr;
}

/**
 * Link one or many parents to a student (no backend change required).
 * Tries several common REST shapes and stops at first success.
 * @param {number} studentId
 * @param {number[]} parentIds
 */
async function linkParents(studentId, parentIds = []) {
  if (!studentId || !Array.isArray(parentIds) || parentIds.length === 0) return;

  // Bodies different backends might expect
  const bodies = [
    { parent_id: parentIds[0] },                    // single parent
    { parentIds },                                  // camelCase list
    { parent_ids: parentIds },                      // snake_case list
    { parents: parentIds },                         // generic list
    { parents: parentIds.map((id) => ({ id })) },   // list of objects
  ];

  const calls = [];

  // Student-centric routes
  for (const body of bodies) {
    calls.push(() => axiosClient.put(`/admin/students/${studentId}/parents`, body));
    calls.push(() => axiosClient.post(`/admin/students/${studentId}/attach-parents`, body));
    calls.push(() => axiosClient.post(`/admin/students/${studentId}/parents/attach`, body));
    calls.push(() => axiosClient.post(`/admin/students/${studentId}/parents/sync`, body));
  }

  // Parent-centric routes (loop all parents)
  for (const pid of parentIds) {
    calls.push(() => axiosClient.post(`/admin/parents/${pid}/attach-child`, { student_id: studentId }));
    calls.push(() => axiosClient.post(`/admin/parents/${pid}/children`,     { student_id: studentId }));
    calls.push(() => axiosClient.post(`/admin/parents/${pid}/children/attach`, { student_id: studentId }));
  }

  // Generic family route (if you have it)
  for (const body of bodies) {
    calls.push(() => axiosClient.post(`/admin/families/attach`, { student_id: studentId, ...body }));
  }

  return tryCalls(calls);
}

/* ------------------------------- API ------------------------------- */

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
  all() {
    // GET /api/admin/users?per_page=1000
    return axiosClient.get("/admin/users", { params: { per_page: 1000 } });
  },

  // --- Role-scoped helpers (keep your existing return shape) ---
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

  // --- NEW: parent linking utility ---
  linkParents,
};

export default UserApi;
export { UserApi };
