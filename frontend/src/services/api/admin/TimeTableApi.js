import { axiosClient } from "../../../api/axios";

const TimeTableApi = {
  adminList: (params)         => axiosClient.get("/admin/timetables", { params }),
  create:    (data)           => axiosClient.post("/admin/timetables", data),
  update:    (id, data)       => axiosClient.put(`/admin/timetables/${id}`, data),
  delete:    (id)             => axiosClient.delete(`/admin/timetables/${id}`),

  // views
  student: (params={}) => axiosClient.get('/eleve/emploi-du-temps', { params }),
  teacher: (params={}) => axiosClient.get('/enseignant/emploi-du-temps', { params }),
  parent:  (params={}) => axiosClient.get('/parent/emploi-du-temps',  { params }),

  studentPlans:  (params={}) => axiosClient.get('/eleve/monthly-plans',     { params }),
  teacherPlans:  (params={}) => axiosClient.get('/enseignant/monthly-plans',{ params }),
  parentPlans:   (params={}) => axiosClient.get('/parent/monthly-plans',    { params }),

  unwrap:    (r)              => r?.data?.data ?? r?.data ?? [],
};

export default TimeTableApi;