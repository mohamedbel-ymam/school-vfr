import {axiosClient} from "../../../api/axios";

export const studentGradesApi = {
  // returns paginator from /api/student/grades (you may already have it)
  list: (params = {}) => axiosClient.get("/eleve/grades", { params }),
};
