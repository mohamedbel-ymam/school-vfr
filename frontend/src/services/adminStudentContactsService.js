import { axiosClient } from "../api/axios";

export const getAdminStudentContacts = async () => {
  const response = await axiosClient.get("/admin/student-contacts");
  return response.data;
};