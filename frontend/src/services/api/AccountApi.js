import { axiosClient, ensureCsrf } from "../../api/axios";

const AccountApi = {
  changePassword: async (data) => {
    await ensureCsrf();
    return axiosClient.put("/me/password", data);
  },
};

export default AccountApi;