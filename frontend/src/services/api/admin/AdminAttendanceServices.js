import { axiosClient } from "../../../api/axios";

export const adminAttendanceApi = {
  weekly: ({ degreeId, weekStart }) =>
    axiosClient.get("/admin/attendance/weekly", {
      params: { degree_id: degreeId, week_start: weekStart },
    }),

  updateRecordStatus: (recordId, status) =>
    axiosClient.put(`/admin/attendance/record/${recordId}`, { status }),

  exportRangeUrl: ({ degreeId, from, to }) => {
    const base = import.meta.env.VITE_API_URL || "";
    const qs = new URLSearchParams({ degree_id: degreeId, from, to }).toString();
    return `${base}/api/admin/attendance/export?${qs}`;
  },
};