import {axiosClient} from "../../../api/axios";

export const teacherDegreesApi = {
  list: () => axiosClient.get("/admin/degrees"), 
  // si tu as déjà /teacher/degrees mets-le ici. Sinon, admin/degrees marche seulement si autorisé.
};

export const teacherLeaderboardApi = {
  byDegree: (degreeId, params = {}) =>
    axiosClient.get(`/teacher/degrees/${degreeId}/grades-leaderboard`, { params }),
};

export const teacherGradesApi = {
  list: (params = {}) => axiosClient.get("/teacher/grades", { params }),
  create: (payload) => axiosClient.post("/teacher/grades", payload),
  update: (id, payload) => axiosClient.put(`/teacher/grades/${id}`, payload),
};
