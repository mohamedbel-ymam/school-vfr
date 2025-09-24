import { axiosClient } from "../../../api/axios";

const DegreeApi = {
  list(params = {}) {
    // hits GET /api/degrees (public)
    return axiosClient.get("/degrees", { params });
  },
};

export default DegreeApi;