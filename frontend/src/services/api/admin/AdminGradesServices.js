import axiosClient from "../../../api/axios";

export const adminDegreesApi = {
  list: () => axiosClient.get("/api/admin/degrees"),
};

export const adminLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/api/admin/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const adminGradesApi = {
  list: (params = {}) => axiosClient.get("/api/admin/grades", { params }),
  create: (payload) => axiosClient.post("/api/admin/grades", payload),
  update: (id, payload) => axiosClient.put(`/api/admin/grades/${id}`, payload),
  remove: (id) => axiosClient.delete(`/api/admin/grades/${id}`),
};
