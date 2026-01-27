import {axiosClient} from "../../../api/axios";

export const teacherDegreesApi = {
  // si teacher n'a pas /teacher/degrees, on utilise /admin/degrees (si autorisé)
  list: () => axiosClient.get("/enseignant/degrees"),
};

export const teacherGradesLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/enseignant/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const teacherGradesApi = {
  list: (params = {}) => axiosClient.get("/enseignant/grades", { params }), // paginator
  create: (payload) => axiosClient.post("/enseignant/grades", payload),
  update: (id, payload) => axiosClient.put(`/enseignant/grades/${id}`, payload),
};
