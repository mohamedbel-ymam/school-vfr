import { axiosClient } from "../../../api/axios";

export default {
  // ✅ students is under /api/admin
  list: (params = {}) => axiosClient.get("/admin/students", { params }),

  assignToGroup: (studentId, groupId) =>
    axiosClient.post(`/admin/groups/${groupId}/assign`, {
      student_id: studentId,
    }),
};