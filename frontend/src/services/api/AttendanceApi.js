// src/services/api/admin/AttendanceApi.js
import { axiosClient } from "../../api/axios";

const unwrap = (r) => r?.data?.data ?? r?.data ?? [];

/**
 * Attendance API for Admin (and a read-only call for student).
 * Endpoints (backend):
 *  - GET    /admin/attendance
 *  - PUT    /admin/attendance/bulk
 *  - POST   /admin/attendance/{student}/increment
 *  - GET    /admin/attendance/summary
 *  - GET    /eleve/attendance
 *  - POST   /admin/attendance/generate-from-timetable   <-- NEW
 */
const AttendanceApi = {

  /**
   * List students with counters for a period.
   * @param {{ q?: string, page?: number, per_page?: number, period?: 'overall'|'month'|'week', degree_id?:number }} params
   */
  async list(params = {}) {
    const {
      q = "",
      page = 1,
      per_page = 25,
      period = "overall",
      degree_id,
    } = params;

    const res = await axiosClient.get("/admin/attendance", {
      params: { q, page, per_page, period, degree_id },
    });

    return unwrap(res);
  },

  /**
   * Bulk update counters for many students.
   */
  async bulkUpdate(payload) {
    const res = await axiosClient.put("/admin/attendance/bulk", payload);
    return unwrap(res);
  },

  /**
   * Quick increment for a single student.
   */
  async increment(studentId, type = "absence", amount = 1, extras = {}) {
    const res = await axiosClient.post(
      `/admin/attendance/${studentId}/increment`,
      { type, amount, ...extras }
    );
    return unwrap(res);
  },

  /**
   * Admin dashboard summary (totals + top at-risk)
   */
  async summary(params = {}) {
    const { period = "overall" } = params;
    const res = await axiosClient.get("/admin/attendance/summary", {
      params: { period },
    });
    return unwrap(res);
  },

  /**
   * Student self-read of their own counters
   */
  async me(params = {}) {
    const { period = "overall" } = params;
    const res = await axiosClient.get("/eleve/attendance", {
      params: { period },
    });
    return unwrap(res);
  },

  /**
   * NEW: Generate weekly/month/global presence from real timetable
   * @param {{ degree_id:number }} payload
   */
  async generateFromTimetable(payload) {
    const res = await axiosClient.post(
      "/admin/attendance/generate-from-timetable",
      payload
    );
    return unwrap(res);
  },
};

export default AttendanceApi;
