import { axiosClient } from "../../../api/axios";

export default {
  list: () => axiosClient.get("/admin/groups"),
  create: (data) => axiosClient.post("/admin/groups", data),
  update: (id, data) => axiosClient.put(`/admin/groups/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/groups/${id}`),
};