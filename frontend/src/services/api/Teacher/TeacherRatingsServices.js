import {axiosClient} from "../../../api/axios";

export const teacherRatingsLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/teacher/degrees/${degreeId}/ratings-leaderboard`, { params }),
};

export const teacherRatingsApi = {
  list: (params = {}) => axiosClient.get("/teacher/ratings", { params }), // paginator
  upsert: (payload) => axiosClient.post("/teacher/ratings", payload),     // updateOrCreate monthly
  update: (id, payload) => axiosClient.put(`/teacher/ratings/${id}`, payload),
};
