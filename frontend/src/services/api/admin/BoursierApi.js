// src/services/admin/boursierApi.js
import axiosClient from "../../../api/axios";

/* ---------------------- Boursiers CRUD ---------------------- */
export async function fetchBoursiers({ q = "", page = 1 } = {}) {
  const { data } = await axiosClient.get(`/admin/boursiers`, { params: { q, page } });
  return data; // Laravel paginator JSON
}

export async function getBoursierById(boursierId) {
  const { data } = await axiosClient.get(`/admin/boursiers/${boursierId}`);
  return data; // profile with user + disbursements
}

export async function createBoursier(payload) {
  // payload: { name,email,password,university?,field_of_study?,start_year?,duration_years? }
  const { data } = await axiosClient.post(`/admin/boursiers`, payload);
  return data;
}

export async function updateBoursier(boursierId, payload) {
  // payload can include name/email/password/university/field_of_study/start_year/duration_years/status
  const { data } = await axiosClient.put(`/admin/boursiers/${boursierId}`, payload);
  return data;
}

export async function deleteBoursier(boursierId) {
  await axiosClient.delete(`/admin/boursiers/${boursierId}`);
  return true;
}

/* ------------------ Disbursements (quarters) ------------------ */
export async function createDisbursement(boursierId, payload) {
  // payload: { period_start, period_end, amount?, payment_method?, note? }
  const { data } = await axiosClient.post(`/admin/boursiers/${boursierId}/disbursements`, payload);
  return data;
}

export async function markDisbursementPaid(boursierId, disbId, payload = {}) {
  // payload: { payment_method?, note? }
  const { data } = await axiosClient.post(
    `/admin/boursiers/${boursierId}/disbursements/${disbId}/pay`,
    payload
  );
  return data;
}
