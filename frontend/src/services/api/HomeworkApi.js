import { axiosClient } from "../../api/axios";

const HomeworkApi = {
  // lists
  listAdmin:   (params={}) => axiosClient.get("/admin/devoirs", { params }),
  listTeacher: (params={}) => axiosClient.get("/enseignant/devoirs", { params }),
  listStudent: (params={}) => axiosClient.get("/eleve/devoirs", { params }),
  listParent:  (params={}) => axiosClient.get("/parent/devoirs", { params }),

  // Upload (teacher)
  upload: ({ title, description, degree_id, due_at, file }) => {
    const fd = new FormData();
    fd.append("title", title);
    if (description) fd.append("description", description);
    fd.append("degree_id", degree_id);
    if (due_at) fd.append("due_at", due_at); // "YYYY-MM-DDThh:mm"
    fd.append("file", file);
    return axiosClient.post("/enseignant/devoirs", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Delete
  deleteAsAdmin:   (id) => axiosClient.delete(`/admin/devoirs/${id}`),
  deleteAsTeacher: (id) => axiosClient.delete(`/enseignant/devoirs/${id}`),

  // degrees for select (reuse same public endpoint you already have)
  degrees: () => axiosClient.get("/degrees-public"),
};

export default HomeworkApi;
