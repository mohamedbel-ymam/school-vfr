// src/services/api/AccountApi.js
import { axiosClient } from "../../api/axios";

const AccountApi = {
  changePassword: async (data) => {
    return axiosClient.put("/me/password", data);
  },
};

export default AccountApi;
