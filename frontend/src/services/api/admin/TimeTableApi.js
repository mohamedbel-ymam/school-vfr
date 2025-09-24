import { axiosClient } from "../../../api/axios";

const TimetableApi = {
  adminList: (params)         => axiosClient.get("/admin/timetables", { params }),
  create:    (data)           => axiosClient.post("/admin/timetables", data),
  update:    (id, data)       => axiosClient.put(`/admin/timetables/${id}`, data),
  delete:    (id)             => axiosClient.delete(`/admin/timetables/${id}`),

  // views
  student: (params={}) => axiosClient.get('/eleve/emploi-du-temps', { params }),
  teacher: (params={}) => axiosClient.get('/enseignant/emploi-du-temps', { params }),
  parent:  (params={}) => axiosClient.get('/parent/emploi-du-temps',  { params }),

  unwrap:    (r)              => r?.data?.data ?? r?.data ?? [],
};

export default TimetableApi;