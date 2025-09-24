import { axiosClient } from "../../../api/axios";

const SubjectApi = {
  list:   (params = { per_page: 1000 }) => axiosClient.get("/admin/subjects", { params }),
  get:    (id) => axiosClient.get(`/admin/subjects/${id}`),
  create: (data) => axiosClient.post("/admin/subjects", data),
  update: (id, data) => axiosClient.put(`/admin/subjects/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/subjects/${id}`),
};

export default SubjectApi;