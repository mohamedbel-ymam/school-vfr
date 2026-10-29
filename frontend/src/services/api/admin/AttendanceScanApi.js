import { axiosClient } from "../../../api/axios";

export const attendanceScanApi = {
  /**
   * Upload paper attendance scan and perform OMR detection.
   */
  uploadScan: (formData, onProgress = null) => {
    return axiosClient.post("/attendances/upload-scan", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  /**
   * Confirm and save verified attendance records to database.
   */
  confirmScan: (records) => {
    return axiosClient.post("/attendances/confirm-scan", { records });
  },

  /**
   * Get weekly sheet metadata for a given class/week.
   */
  getSheetData: ({ degreeId, weekNumber, year, date }) => {
    return axiosClient.get("/attendances/weekly-sheet/data", {
      params: {
        degree_id: degreeId,
        week_number: weekNumber,
        year,
        date,
      },
    });
  },

  /**
   * Generate PDF download URL.
   */
  getPdfDownloadUrl: ({ degreeId, weekNumber, year, download = true }) => {
    const base = axiosClient.defaults.baseURL || "";
    const cleanBase = base.replace(/\/+$/, "");
    const qs = new URLSearchParams({
      degree_id: String(degreeId),
      week_number: String(weekNumber),
      year: String(year),
      ...(download ? { download: "1" } : {}),
    });
    return `${cleanBase}/attendances/weekly-sheet/pdf?${qs.toString()}`;
  },
};
