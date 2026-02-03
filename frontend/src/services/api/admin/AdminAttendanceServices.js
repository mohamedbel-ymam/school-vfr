import { axiosClient } from "../../../api/axios";

export const adminAttendanceApi = {
  weekly: ({ degreeId, weekStart }) =>
    axiosClient.get("/admin/attendance/weekly", {
      params: { degree_id: degreeId, week_start: weekStart },
    }),

  updateRecordStatus: (recordId, status) =>
    axiosClient.put(`/admin/attendance/record/${recordId}`, { status }),

  exportRangeUrl: ({ degreeId, from, to }) => {
    const base = axiosClient.defaults.baseURL; // ".../api"
    const qs = new URLSearchParams({ degree_id: String(degreeId), from, to });
    return `${base}/admin/attendance/export?${qs.toString()}`;
  },

  // Optional if you add it later
  exportWeeklySummaryUrl: ({ degreeId, weekStart }) => {
    const base = axiosClient.defaults.baseURL;
    const qs = new URLSearchParams({ degree_id: String(degreeId), week_start: weekStart });
    return `${base}/admin/attendance/export-weekly-summary?${qs.toString()}`;
  },
};
