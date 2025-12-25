import { axiosClient } from "../../../api/axios";

/**
 * Fetch all boursier contributions (ADMIN)
 * GET /api/admin/boursier-contributions
 */
export async function fetchBoursierContributions() {
  const { data } = await axiosClient.get(
    "/admin/boursier-contributions"
  );
  return data;
}

/**
 * Update contribution status
 * PUT /api/admin/boursier-contributions/{id}
 *
 * payload example:
 * { status: 'approved' | 'rejected' | 'done' }
 */
export async function updateBoursierContribution(id, payload) {
  const { data } = await axiosClient.put(
    `/admin/boursier-contributions/${id}`,
    payload
  );
  return data;
}

/**
 * Delete a contribution
 * DELETE /api/admin/boursier-contributions/{id}
 */
export async function deleteBoursierContribution(id) {
  await axiosClient.delete(
    `/admin/boursier-contributions/${id}`
  );
  return true;
}

/* Optional default export */
export default {
  fetchBoursierContributions,
  updateBoursierContribution,
  deleteBoursierContribution,
};
