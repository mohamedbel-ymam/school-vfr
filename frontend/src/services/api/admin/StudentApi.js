import { axiosClient } from "../../../api/axios";

export default {
  // ADMIN ONLY
  list: (params = {}) =>
    axiosClient.get("/admin/students", { params }),

  // ADMIN ONLY
  assignToGroup: (studentId, groupId) =>
    axiosClient.post(`/admin/groups/${groupId}/assign`, {
      student_id: studentId,
    }),
};