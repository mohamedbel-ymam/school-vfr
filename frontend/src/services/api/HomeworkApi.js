// services/api/HomeworkApi.js
import { axiosClient } from "../../api/axios";

const HomeworkApi = {
  // lists
  listAdmin:   (params={}) => axiosClient.get("/admin/devoirs", { params }),
  listTeacher: (params={}) => axiosClient.get("/enseignant/devoirs", { params }),
  listStudent: (params={}) => axiosClient.get("/eleve/devoirs", { params }),
  listParent:  (params={}) => axiosClient.get("/parent/devoirs", { params }),

  upload: ({ title, description, degree_id, due_at, file }) => {
    const fd = new FormData();
    fd.append("title", title);
    if (description) fd.append("description", description);
    fd.append("degree_id", degree_id);

    // convert "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:SS"
    if (due_at) {
      const normalized = due_at.includes("T")
        ? due_at.replace("T"," ") + (due_at.length === 16 ? ":00" : "")
        : due_at;
      fd.append("due_at", normalized);
    }

    fd.append("file", file);
    return axiosClient.post("/enseignant/devoirs", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAsAdmin:   (id) => axiosClient.delete(`/admin/devoirs/${id}`),
  deleteAsTeacher: (id) => axiosClient.delete(`/enseignant/devoirs/${id}`),

  degrees: () => axiosClient.get("/degrees", { params: { per_page: 1000 } }),
};

export default HomeworkApi;
