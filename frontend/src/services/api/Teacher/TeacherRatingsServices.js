import {axiosClient} from "../../../api/axios";

export const teacherRatingsLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/enseignant/degrees/${degreeId}/ratings-leaderboard`, { params }),
};

export const teacherRatingsApi = {
  list: (params = {}) => axiosClient.get("/enseignant/ratings", { params }), // paginator
  upsert: (payload) => axiosClient.post("/enseignant/ratings", payload),     // updateOrCreate monthly
  update: (id, payload) => axiosClient.put(`/enseignant/ratings/${id}`, payload),
};
