import { axiosClient } from "../../api/axios";

const DocumentApi = {
  // lists
  listAdmin:   (params={}) => axiosClient.get("/admin/documents", { params }),
  listTeacher: (params={}) => axiosClient.get("/enseignant/documents", { params }),
  listStudent: (params={}) => axiosClient.get("/eleve/documents", { params }),
  listParent:  (params={}) => axiosClient.get("/parent/documents", { params }),

  // Upload (teacher)
  upload: async ({ title, description, degree_id, file }) => {
    const fd = new FormData();
    fd.append("title", title);
    if (description) fd.append("description", description);
    fd.append("degree_id", degree_id);
    fd.append("file", file);
    return axiosClient.post("/enseignant/documents", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Delete (admin or owner teacher)
  deleteAsAdmin:  (id) => axiosClient.delete(`/admin/documents/${id}`),
  deleteAsTeacher:(id) => axiosClient.delete(`/enseignant/documents/${id}`),

  // degrees for select
  degrees: () => axiosClient.get("/degrees-public"),
};

export default DocumentApi;
