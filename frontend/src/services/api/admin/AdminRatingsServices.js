import {axiosClient} from "../../../api/axios";

export const adminDegreesApi = {
  list: () => axiosClient.get("/admin/degrees"),
};

export const adminRatingsLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/admin/degrees/${degreeId}/ratings-leaderboard`, { params }),
};

export const adminRatingsApi = {
  list: (params = {}) => axiosClient.get("/admin/ratings", { params }), // paginator
  upsert: (payload) => axiosClient.post("/admin/ratings", payload),     // updateOrCreate
  update: (id, payload) => axiosClient.put(`/admin/ratings/${id}`, payload),
  remove: (id) => axiosClient.delete(`/admin/ratings/${id}`),
};
