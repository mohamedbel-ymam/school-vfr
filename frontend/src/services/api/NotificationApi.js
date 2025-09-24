// src/services/Api/NotificationApi.js
import { axiosClient, ensureCsrf } from "../../api/axios";

const toIntArr = (v) =>
  (Array.isArray(v) ? v : [v])
    .filter((x) => x !== undefined && x !== null && x !== "")
    .map(Number)
    .filter(Number.isFinite);

const normalize = (inp = {}) => {
  const allowed = new Set([
    "all_students",
    "all_teachers",
    "all_parents",
    "degree_students",
    "user",
    "users",
  ]);
  const audience = allowed.has(inp.audience) ? inp.audience : "user";

  const title = String(inp.title ?? "").trim();
  const message = String(inp.message ?? inp.body ?? inp.content ?? "").trim();

  // derive roles from audience
  let roles = Array.isArray(inp.roles) ? inp.roles.slice() : [];
  switch (audience) {
    case "all_students":
      roles = ["student"];
      break;
    case "all_teachers":
      roles = ["teacher"];
      break;
    case "all_parents":
      roles = ["parent"];
      break;
    case "degree_students":
      roles = ["student"];
      break;
    // "user"/"users" rely on IDs below
  }

  const degree_ids = toIntArr(inp.degree_ids ?? inp.degree_id);
  const user_ids = toIntArr(inp.user_ids ?? inp.user_id);

  const channels = (inp.channels?.length ? inp.channels : ["database"])
    .map((c) => String(c).toLowerCase().trim())
    .filter((c) => c === "database" || c === "mail");

  return {
    audience,
    title,
    message,
    content: message, // some controllers require 'content'
    roles: [...new Set(roles)],
    degree_id: degree_ids[0] ?? null, // include singulars for strict backends
    user_id: user_ids[0] ?? null,
    degree_ids,
    user_ids,
    channels: channels.length ? channels : ["database"],
  };
};

const NotificationApi = {
  async list(params = {}) {
    const { data } = await axiosClient.get("/notifications", { params });
    return data;
  },

  async markRead(id) {
    await ensureCsrf();
    const { data } = await axiosClient.post(`/notifications/${id}/read`);
    return data;
  },

  async markAllRead() {
    await ensureCsrf();
    const { data } = await axiosClient.post("/notifications/read-all");
    return data;
  },

  async broadcast(formValues) {
    const payload = normalize(formValues);
    if (!payload.title || !payload.message)
      throw new Error("Titre et message requis.");
    if (
      !payload.roles.length &&
      !payload.degree_ids.length &&
      !payload.user_ids.length
    ) {
      throw new Error("Sélectionnez au moins un destinataire.");
    }
    await ensureCsrf();
    // Controller expects { payload: {...} }
    const { data } = await axiosClient.post(
      "/admin/notifications/broadcast",
      { payload }
    );
    return data;
  },
};

export default NotificationApi;
export { NotificationApi };
