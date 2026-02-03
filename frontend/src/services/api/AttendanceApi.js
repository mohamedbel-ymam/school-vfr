// src/services/api/attendanceApi.js
import { axiosClient } from "../../api/axios";

/**
 * =========================================================
 * TEACHER (existing routes you already use)
 * =========================================================
 * GET  /enseignant/attendance/roster?degree_id=
 * PUT  /enseignant/attendance/mark
 */
export const teacherAttendanceApi = {
  roster: (degreeId, params = {}) =>
    axiosClient.get("/enseignant/attendance/roster", {
      params: { degree_id: degreeId, ...params },
    }),

  mark: ({ session_id, student_id, status }) =>
    axiosClient.put("/enseignant/attendance/mark", {
      session_id,
      student_id,
      status, // presence | absence
    }),
};

/**
 * =========================================================
 * ADMIN (your backend routes)
 * =========================================================
 * GET   /admin/attendance/weekly?degree_id=&week_start=
 * GET   /admin/attendance/monthly?degree_id=&month=YYYY-MM
 * PUT   /admin/attendance/record/{record}
 * GET   /admin/attendance/export?degree_id=&from=&to=
 * POST  /admin/attendance/backfill
 */
export const adminAttendanceApi = {
  weekly: ({ degreeId, weekStart }) =>
    axiosClient.get("/admin/attendance/weekly", {
      params: { degree_id: degreeId, week_start: weekStart },
    }),

  monthly: ({ degreeId, month }) =>
    axiosClient.get("/admin/attendance/monthly", {
      params: { degree_id: degreeId, month }, // YYYY-MM
    }),

  updateRecordStatus: (recordId, status) =>
    axiosClient.put(`/admin/attendance/record/${recordId}`, { status }), // presence | absence | absence_justifiee

  backfill: ({ degreeId, date, defaultStatus = "not_marked", onlyMissing = true, studentIds }) =>
    axiosClient.post("/admin/attendance/backfill", {
      degree_id: degreeId,
      date,
      default_status: defaultStatus, // presence | absence | absence_justifiee | not_marked
      only_missing: onlyMissing,
      ...(Array.isArray(studentIds) && studentIds.length ? { student_ids: studentIds } : {}),
    }),

  exportRangeUrl: ({ degreeId, from, to }) => {
    const base = axiosClient.defaults.baseURL; // ".../api"
    const qs = new URLSearchParams({
      degree_id: String(degreeId),
      from,
      to,
    });
    return `${base}/admin/attendance/export?${qs.toString()}`;
  },
};

/**
 * =========================================================
 * STUDENT / PARENT
 * =========================================================
 * If your UI imports these today, we keep them to avoid build errors.
 * Add real endpoints later if/when you expose them in Laravel.
 */
export const studentAttendanceApi = {
  // Example (ONLY if you later create it in backend):
  // myMonthly: (month) => axiosClient.get("/eleve/attendance/monthly", { params: { month } }),

  // For now: safe noop methods (won't crash build; will throw if called)
  myMonthly: async () => {
    throw new Error("studentAttendanceApi.myMonthly: endpoint not implemented yet.");
  },
};

export const parentAttendanceApi = {
  // Example (ONLY if you later create it in backend):
  // childMonthly: (studentId, month) =>
  //   axiosClient.get("/parent/attendance/monthly", { params: { student_id: studentId, month } }),

  childMonthly: async () => {
    throw new Error("parentAttendanceApi.childMonthly: endpoint not implemented yet.");
  },
};

// Optional default export if some files import default
export default {
  teacherAttendanceApi,
  adminAttendanceApi,
  studentAttendanceApi,
  parentAttendanceApi,
};
