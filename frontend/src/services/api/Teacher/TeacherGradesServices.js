import {axiosClient} from "../../../api/axios";

export const teacherDegreesApi = {
  // si teacher n'a pas /teacher/degrees, on utilise /admin/degrees (si autorisé)
  list: () => axiosClient.get("/teacher/degrees"),
};

export const teacherGradesLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/teacher/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const teacherGradesApi = {
  list: (params = {}) => axiosClient.get("/teacher/grades", { params }), // paginator
  create: (payload) => axiosClient.post("/teacher/grades", payload),
  update: (id, payload) => axiosClient.put(`/teacher/grades/${id}`, payload),
};
