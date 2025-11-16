// src/services/boursier/selfApi.js
import { axiosClient } from "../../api/axios";

/**
 * Fetch the authenticated boursier profile + disbursements.
 * Backend: GET /api/boursier/me
 */
export async function fetchMe() {
  const resp = await axiosClient.get("/boursier/me");
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
 * Create a new contribution proposal for the authenticated boursier.
 * Backend: POST /api/boursier/contributions
 *
 * payload shape:
 * {
 *   type: 'teaching' | 'mentoring' | 'meetup' | 'donation' | 'other',
 *   title?: string | null,
 *   details?: string,
 *   scheduled_at?: string (YYYY-MM-DD) | null
 * }
 */
export async function createMyContribution(payload) {
  const resp = await axiosClient.post("/boursier/contributions", payload);
  return resp.data;
}

// Optional convenience export
const SelfApi = {
  fetchMe,
  fetchMyContributions,
  createMyContribution,
};

export default SelfApi;
