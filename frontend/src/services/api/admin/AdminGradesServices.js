import {axiosClient} from "../../../api/axios";

export const adminDegreesApi = {
  list: () => axiosClient.get("/admin/degrees"),
};

export const adminLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/admin/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const adminGradesApi = {
  list: (params = {}) => axiosClient.get("/admin/grades", { params }),
  create: (payload) => axiosClient.post("/admin/grades", payload),
  update: (id, payload) => axiosClient.put(`/admin/grades/${id}`, payload),
  remove: (id) => axiosClient.delete(`/admin/grades/${id}`),
};
