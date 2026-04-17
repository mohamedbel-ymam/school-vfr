import { axiosClient } from "../api/axios";

export const getAdminStudentContacts = async (degreeId = null) => {
  const response = await axiosClient.get("/admin/student-contacts", {
    params: degreeId ? { degree_id: degreeId } : {},
  });

  return response.data;
};