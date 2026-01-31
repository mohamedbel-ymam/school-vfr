import { axiosClient } from "../../../api/axios";

export const AdminAvatarReviewApi = {
  pending: (params = {}) => axiosClient.get("/admin/avatars/pending", { params }),
  approve: (studentId) => axiosClient.post(`/admin/avatars/${studentId}/approve`),
  reject: (studentId) => axiosClient.post(`/admin/avatars/${studentId}/reject`),
  remove: (studentId) => axiosClient.delete(`/admin/avatars/${studentId}`), // optionnel
};
