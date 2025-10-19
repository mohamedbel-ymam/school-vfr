import { axiosClient } from "../../../api/axios";

const TimeTableApi = {
  // ADMIN (list for a week + CRUD)
  week:  (params = {}) => axiosClient.get("/admin/timetables", { params }),
  create: (payload)     => axiosClient.post("/admin/timetables", payload),
  update: (id, payload) => axiosClient.put(`/admin/timetables/${id}`, payload),
  remove: (id)          => axiosClient.delete(`/admin/timetables/${id}`),

  // TEACHER (matches your /enseignant/emploi-du-temps)
  teacher: (params = {}) => axiosClient.get("/enseignant/emploi-du-temps", { params }),

  // STUDENT (matches your /eleve/emploi-du-temps)
  student: (params = {}) => axiosClient.get("/eleve/emploi-du-temps", { params }),

  // (already used elsewhere)
  studentMonthly: (params = {}) => axiosClient.get("/eleve/monthly-plans", { params }),
  teacherMonthly: (params = {}) => axiosClient.get("/enseignant/monthly-plans", { params }),
};

export default TimeTableApi;
