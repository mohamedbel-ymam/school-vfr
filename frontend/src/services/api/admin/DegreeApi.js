import { axiosClient } from "../../../api/axios";

const DegreeApi = {
  // Admin list (paginated)
  list: (params = {}) => axiosClient.get("/admin/degrees", { params }),

  // Public, read-only list you exposed at /degrees
  publicList: (params = {}) => axiosClient.get("/degrees", { params }),

  // ✅ Shim so SendNotification.jsx keeps working
  all: () => axiosClient.get("/degrees", { params: { per_page: 1000 } }),
};
export default DegreeApi;

 
