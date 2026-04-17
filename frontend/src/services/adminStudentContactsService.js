import api from "../lib/axios";

export const getAdminStudentContacts = async () => {
  const response = await api.get("/admin/student-contacts");
  return response.data;
};