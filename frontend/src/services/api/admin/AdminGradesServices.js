import axios from "../../../api/axios";

export const adminDegreesApi = {
  list: () => axios.get("/api/admin/degrees"),
};

export const adminLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axios.get(`/api/admin/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const adminGradesApi = {
  list: (params = {}) => axios.get("/api/admin/grades", { params }),
  create: (payload) => axios.post("/api/admin/grades", payload),
  update: (id, payload) => axios.put(`/api/admin/grades/${id}`, payload),
  remove: (id) => axios.delete(`/api/admin/grades/${id}`),
};
