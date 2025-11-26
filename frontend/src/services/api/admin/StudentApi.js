import { axiosClient } from "../../../api/axios";

export default {
  // Liste des élèves (filtrable par degree_id)
  list: (params = {}) => axiosClient.get("/students", { params }),

  // Toujours utilisé côté admin : assigner un élève à un groupe
  assignToGroup: (studentId, groupId) =>
    axiosClient.post(`/admin/groups/${groupId}/assign`, { student_id: studentId }),
};
