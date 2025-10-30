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
    content: message, // some backends require 'content'
    roles: [...new Set(roles)],
    degree_id: degree_ids[0] ?? null,
    user_id: user_ids[0] ?? null,
    degree_ids,
    user_ids,
    channels: channels.length ? channels : ["database"],
  };
};

// Try a list of GET urls until one works; return the full axios response
const tryGet = async (urls, params = {}) => {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await axiosClient.get(url, { params });
      return res; // full axios response (res.data is available)
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
};

// Try a list of DELETE urls until one works
const tryDelete = async (urls) => {
  let lastErr;
  await ensureCsrf();
  for (const url of urls) {
    try {
      const res = await axiosClient.delete(url);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
};

const NotificationApi = {
  // ------------------------------ List/index ------------------------------
  // Returns an axios-like response so caller can use res?.data
  async list(params = {}) {
    return await tryGet(
      ["/admin/notifications", "/notifications"],
      params
    );
  },
  async index(params = {}) {
    return this.list(params);
  },
  async all(params = {}) {
    return this.list(params);
  },

  // ------------------------------ Actions ------------------------------
  async markRead(id) {
    await ensureCsrf();
    return await axiosClient.post(`/notifications/${id}/read`);
  },

  async markAllRead() {
    await ensureCsrf();
    return await axiosClient.post("/notifications/read-all");
  },

  async destroy(id) {
    return await tryDelete([
      `/admin/notifications/${id}`,
      `/notifications/${id}`,
    ]);
  },
  // aliases for convenience
  async delete(id) {
    return this.destroy(id);
  },
  async remove(id) {
    return this.destroy(id);
  },

  // ------------------------------ Broadcast ------------------------------
  async broadcast(formValues) {
    const payload = normalize(formValues);
    if (!payload.title || !payload.message)
      throw new Error("Titre et message requis.");
    if (!payload.roles.length && !payload.degree_ids.length && !payload.user_ids.length)
      throw new Error("Sélectionnez au moins un destinataire.");

    await ensureCsrf();

    // Prefer admin route; fallback to non-admin if you mapped it that way
    try {
      return await axiosClient.post("/admin/notifications/broadcast", { payload });
    } catch {
      return await axiosClient.post("/notifications/broadcast", { payload });
    }
  },

  // Expose the client for last-resort fallbacks from components
  client: axiosClient,
};

export default NotificationApi;
export { NotificationApi };
