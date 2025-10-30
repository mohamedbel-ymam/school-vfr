// src/services/api/NotificationApi.js
import { axiosClient, ensureCsrf } from "../../api/axios";

/* ------------------------------ helpers ------------------------------ */
const toIntArr = (v) =>
  (Array.isArray(v) ? v : [v])
    .filter((x) => x !== undefined && x !== null && x !== "")
    .map(Number)
    .filter(Number.isFinite);

const normalize = (inp = {}) => {
  const allowed = new Set([
    "all_students", "all_teachers", "all_parents",
    "degree_students", "user", "users",
  ]);
  const audience = allowed.has(inp.audience) ? inp.audience : "user";

  const title = String(inp.title ?? "").trim();
  const message = String(inp.message ?? inp.body ?? inp.content ?? "").trim();

  // derive roles from audience
  let roles = Array.isArray(inp.roles) ? inp.roles.slice() : [];
  switch (audience) {
    case "all_students": roles = ["student"]; break;
    case "all_teachers": roles = ["teacher"]; break;
    case "all_parents":  roles = ["parent"];  break;
    case "degree_students": roles = ["student"]; break;
    // "user"/"users" rely on IDs
  }

  const degree_ids = toIntArr(inp.degree_ids ?? inp.degree_id);
  const user_ids   = toIntArr(inp.user_ids ?? inp.user_id);

  const channels = (inp.channels?.length ? inp.channels : ["database"])
    .map((c) => String(c).toLowerCase().trim())
    .filter((c) => c === "database" || c === "mail");

  return {
    audience,
    title,
    message,
    content: message,
    roles: [...new Set(roles)],
    degree_id: degree_ids[0] ?? null,
    user_id: user_ids[0] ?? null,
    degree_ids,
    user_ids,
    channels: channels.length ? channels : ["database"],
  };
};

// GET helper (returns full axios response)
const tryGet = async (urls, params = {}) => {
  let lastErr;
  for (const url of urls) {
    try {
      return await axiosClient.get(url, { params });
    } catch (e) {
      lastErr = e;
      const code = e?.response?.status;
      // If unauthorized for admin, don't try again with the same /admin URL
      if (code === 401 || code === 403) break;
    }
  }
  throw lastErr;
};

// DELETE helper
const tryDelete = async (urls) => {
  let lastErr;
  await ensureCsrf();
  for (const url of urls) {
    try {
      return await axiosClient.delete(url);
    } catch (e) {
      lastErr = e;
      const code = e?.response?.status;
      if (code === 401 || code === 403) break;
    }
  }
  throw lastErr;
};

const NotificationApi = {
  /* ------------------------------ List/index ------------------------------ */
  // Use in admin pages. If caller is not admin (401/403), return empty structure.
  async list(params = {}) {
    try {
      return await tryGet(["/admin/notifications"], params);
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        // graceful empty payload for non-admins
        return { data: { data: [], meta: { total: 0 } } };
      }
      throw e;
    }
  },
  async index(params = {}) { return this.list(params); },
  async all(params = {})   { return this.list(params); },

  /* ------------------------------ Actions ------------------------------ */
  async markRead(id) {
    await ensureCsrf();
    return await axiosClient.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await ensureCsrf();
    return await axiosClient.post("/notifications/read-all");
  },

  async destroy(id) {
    return await tryDelete([`/admin/notifications/${id}`]);
  },
  async delete(id) { return this.destroy(id); },
  async remove(id) { return this.destroy(id); },

  /* ------------------------------ Broadcast ------------------------------ */
  async broadcast(formValues) {
    const payload = normalize(formValues);
    if (!payload.title || !payload.message) {
      throw new Error("Titre et message requis.");
    }
    if (!payload.roles.length && !payload.degree_ids.length && !payload.user_ids.length) {
      throw new Error("Sélectionnez au moins un destinataire.");
    }

    await ensureCsrf();

    try {
      return await axiosClient.post("/admin/notifications/broadcast", { payload });
    } catch (e) {
      const code = e?.response?.status;
      // Only fallback if admin route is missing; do NOT hide validation errors (422) or auth (401/403)
      if (code === 404 || code === 405) {
        return await axiosClient.post("/notifications/broadcast", { payload });
      }
      throw e;
    }
  },

  // Expose axios client for rare fallbacks
  client: axiosClient,
};

export default NotificationApi;
export { NotificationApi };
