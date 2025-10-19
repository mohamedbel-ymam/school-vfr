// src/services/api/admin/TimeTableApi.js
import { axiosClient } from "../../../api/axios";

const TimeTableApi = {
  // Admin list for a specific week (Monday date)
  week: (params = {}) => axiosClient.get("/admin/timetables", { params }), // expects ?week_start=YYYY-MM-DD

  // CRUD
  create: (payload) => axiosClient.post("/admin/timetables", payload),
  update: (id, payload) => axiosClient.put(`/admin/timetables/${id}`, payload),
  remove: (id) => axiosClient.delete(`/admin/timetables/${id}`),

  // (existing)
  student: (params = {}) => axiosClient.get("/eleve/timetable", { params }),
  teacher: (params = {}) => axiosClient.get("/enseignant/timetable", { params }),
};

export default TimeTableApi;
