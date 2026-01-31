import { axiosClient } from "../../../api/axios";

const StudentAvatarApi = {
  status: () => axiosClient.get("/student/avatar"),
  upload: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return axiosClient.post("/student/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default StudentAvatarApi;
