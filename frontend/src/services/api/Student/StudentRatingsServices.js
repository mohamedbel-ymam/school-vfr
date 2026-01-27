import {axiosClient} from "../../../api/axios";

export const studentRatingsApi = {
  // aggregated rows (term, period, avg_teacher_stars, avg_admin_stars, avg_all_stars...)
  list: (params = {}) => axiosClient.get("/eleve/ratings", { params }),
};