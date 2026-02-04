import { axiosClient } from "../../../api/axios";

export const adminAttendanceApi = {
  // ✅ matches: Route::get('attendance/weekly', ...)
  weekly: ({ degreeId, weekStart }) =>
    axiosClient.get("/admin/attendance/weekly", {
      params: { degree_id: degreeId, week_start: weekStart },
    }),

  // ✅ optional matches: Route::get('attendance/monthly', ...)
  monthly: ({ degreeId, month }) =>
    axiosClient.get("/admin/attendance/monthly", {
      params: { degree_id: degreeId, month }, // month = "YYYY-MM"
    }),

  // ✅ matches: Route::put('attendance/record/{record}', ...)
  updateRecordStatus: (recordId, status) =>
    axiosClient.put(`/admin/attendance/record/${recordId}`, { status }),

  // ✅ matches: Route::post('attendance/backfill', ...)
  backfill: ({ degreeId, date, defaultStatus = "not_marked", onlyMissing = true, studentIds }) =>
    axiosClient.post("/admin/attendance/backfill", {
      degree_id: degreeId,
      date,
      default_status: defaultStatus,
      only_missing: onlyMissing,
      ...(studentIds?.length ? { student_ids: studentIds } : {}),
    }),
    exportWeeklySummaryUrl: ({ degreeId, from, to }) => {
  const base = axiosClient.defaults.baseURL;
  const qs = new URLSearchParams({
    degree_id: String(degreeId),
    from,
    to,
  });
  return `${base}/admin/attendance/export-weekly-summary?${qs.toString()}`;
    },

  // ✅ matches: Route::get('attendance/export', ...)
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
