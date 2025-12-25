import { axiosClient } from "../../api/axios";

/**
 * Fetch the authenticated boursier profile + related data.
 * Backend: GET /api/boursier/me
 */
export async function fetchMe() {
  const resp = await axiosClient.get("/boursier/me");
  return resp.data;
}

/**
 * Update the authenticated boursier academic profile (SELF).
 * Backend: PUT /api/boursier/profile
 *
 * payload:
 * {
 *   university: string,
 *   field_of_study: string
 * }
 */
export async function updateMyProfile(payload) {
  const resp = await axiosClient.put("/boursier/profile", payload);
  return resp.data;
}

/**
 * Fetch all contributions of the authenticated boursier.
 * Backend: GET /api/boursier/contributions
 */
export async function fetchMyContributions() {
  const resp = await axiosClient.get("/boursier/contributions");
  return resp.data;
}

/**
 * Create a new contribution proposal (NON-FINANCIAL).
 * Backend: POST /api/boursier/contributions
 */
export async function createMyContribution(payload) {
  const resp = await axiosClient.post("/boursier/contributions", payload);
  return resp.data;
}

/* Optional grouped export */
const SelfApi = {
  fetchMe,
  updateMyProfile,
  fetchMyContributions,
  createMyContribution,
};

export default SelfApi;
