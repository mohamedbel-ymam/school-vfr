// src/services/api/admin/GroupApi.js
import { axiosClient } from "../../../api/axios";

const GroupApi = {
  list:   () => axiosClient.get("/admin/groups"),
  create: (data) => axiosClient.post("/admin/groups", data),
  update: (id, data) => axiosClient.put(`/admin/groups/${id}`, data),
  delete: (id) => axiosClient.delete(`/admin/groups/${id}`),
  assign: (groupId, studentId) =>
    axiosClient.post(`/admin/groups/${groupId}/assign`, {
      student_id: studentId,
    }),
};

export default GroupApi;
