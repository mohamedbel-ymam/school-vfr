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

// Treat most 4xx in this probing flow as "soft" so we can try the next pattern
function isSoftError(e) {
  const st = e?.response?.status;
  return [400, 401, 403, 404, 405, 409, 422].includes(st);
}

// Run a list of labeled axios calls until one succeeds; log the attempt table
async function tryCallsVerbose(calls) {
  const attempts = [];
  for (const { label, fn } of calls) {
    try {
      const res = await fn();
      attempts.push({ ok: true, status: res?.status ?? 200, label });
      // eslint-disable-next-line no-console
      console.table(attempts);
      return res;
    } catch (e) {
      const st = e?.response?.status ?? "ERR";
      attempts.push({ ok: false, status: st, label });
      if (!isSoftError(e)) {
        console.table(attempts);
        throw e;
      }
      // continue to next attempt
    }
  }
  // eslint-disable-next-line no-console
  console.table(attempts);
  const err = new Error("All parent-link attempts failed");
  err.attempts = attempts;
  throw err;
}

/**
 * Link one or many parents to a student.
 * Tries MANY common REST shapes & prefixes, logs a table of attempts.
 * @param {number} studentId
 * @param {number[]} parentIds
 */
async function linkParents(studentId, parentIds = []) {
  if (!studentId || !Array.isArray(parentIds) || parentIds.length === 0) return;

  // Deduplicate + validate
  const uniq = Array.from(new Set(parentIds.map(Number).filter(n => Number.isFinite(n) && n > 0)));
  if (!uniq.length) return;

  // ---------- payload candidates ----------
  const listBodies = [
    { parentIds: uniq },
    { parent_ids: uniq },
    { parents: uniq },
    { parents: uniq.map(id => ({ id })) },
    { student_id: studentId, parentIds: uniq },
    { student_id: studentId, parent_ids: uniq },
    { student_id: studentId, parents: uniq },
  ];

  const singleBodies = uniq.flatMap(id => ([
    { parent_id: id },
    { parent: id },
    { parent: { id } },
  ]));

  // Parent-centric bodies (attach student to each parent)
  const parentAttachBodies = [
    { student_id: studentId },
    { child_id: studentId },
    { children_ids: [studentId] },
    { children: [studentId] },
  ];

  // ---------- path candidates (with/without /admin & /api) ----------
  const prefixes = ["", "/admin", "/api", "/api/admin"]; // covering all is safe

  const studentPaths = (pfx) => [
    `${pfx}/students/${studentId}/parents`,
    `${pfx}/students/${studentId}/attach-parents`,
    `${pfx}/students/${studentId}/parents/attach`,
    `${pfx}/students/${studentId}/parents/sync`,
    `${pfx}/users/${studentId}/parents`,
    `${pfx}/users/${studentId}/parents/attach`,
    `${pfx}/users/${studentId}/attach-parents`,
    `${pfx}/users/${studentId}/relationships/parents`,
  ];

  const parentPaths  = (pfx, pid) => [
    `${pfx}/parents/${pid}/children`,
    `${pfx}/parents/${pid}/children/attach`,
    `${pfx}/parents/${pid}/attach-child`,
    `${pfx}/users/${pid}/children`,
    `${pfx}/users/${pid}/children/attach`,
  ];

  const genericPaths = (pfx) => [
    `${pfx}/families/attach`,
    `${pfx}/relations/parents-children/attach`,
    `${pfx}/relationships/parent-child/attach`,
  ];

  // ---------- build attempts ----------
  const attempts = [];

  // 1) Student-centric: list bodies with PUT/POST + single bodies with POST
  for (const pfx of prefixes) {
    for (const url of studentPaths(pfx)) {
      for (const body of listBodies) {
        attempts.push({ label: `PUT ${url} (list)`,  fn: () => axiosClient.put(url, body) });
        attempts.push({ label: `POST ${url} (list)`, fn: () => axiosClient.post(url, body) });
      }
      for (const body of singleBodies) {
        attempts.push({ label: `POST ${url} (single)`, fn: () => axiosClient.post(url, body) });
      }
    }
  }

  // 2) Parent-centric: for each parent, attach this student
  for (const pfx of prefixes) {
    for (const pid of uniq) {
      for (const url of parentPaths(pfx, pid)) {
        for (const body of parentAttachBodies) {
          attempts.push({ label: `POST ${url}`, fn: () => axiosClient.post(url, body) });
        }
      }
    }
  }

  // 3) Generic relations/family routes
  for (const pfx of prefixes) {
    for (const url of genericPaths(pfx)) {
      for (const body of listBodies) {
        attempts.push({
          label: `POST ${url} (combined)`,
          fn: () => axiosClient.post(url, { student_id: studentId, ...body }),
        });
      }
    }
  }

  // ---------- run attempts (with logging) ----------
  return tryCallsVerbose(attempts);
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

  // --- Deletion (backward-compatible) ---
  async delete(id) {
    const tries = [
      () => axiosClient.delete(`/admin/users/${id}`),
      () => axiosClient.delete(`/admin/students/${id}`),
      () => axiosClient.delete(`/users/${id}`),
      () => axiosClient.delete(`/students/${id}`),
    ];
    let lastErr;
    for (const fn of tries) {
      try { return await fn(); }
      catch (e) {
        const st = e?.response?.status;
        if (![403, 404, 405].includes(st)) throw e; // hard error → stop
        lastErr = e; // soft → try next
      }
    }
    throw lastErr || new Error("Delete failed");
  },
  async remove(id)  { return this.delete(id); },
  async destroy(id) { return this.delete(id); },

  // ✅ shim used by SendNotification.jsx
  all() {
    // GET /api/admin/users?per_page=1000
    return axiosClient.get("/admin/users", { params: { per_page: 10000 } });
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
   async boursiers({ q = "", per_page = 1000 } = {}) {
    const resp = await axiosClient.get("/admin/users", {
      params: { role: "boursier", per_page, ...(q ? { q } : {}) },
    });
    resp.list = asArray(resp);
    return resp;
  },

  // --- NEW: parent linking utility ---
  linkParents,
  
};

export default UserApi;
export { UserApi };
