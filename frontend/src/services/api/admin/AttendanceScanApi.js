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
    const params = { degree_id: degreeId };
    if (weekNumber) params.week_number = weekNumber;
    if (year) params.year = year;
    if (date) params.date = date;

    return axiosClient.get("/attendances/weekly-sheet/data", { params });
  },

  /**
   * Fetch and open the weekly attendance sheet PDF in a new tab using the authenticated session.
   */
  openWeeklyPdf: async ({ degreeId, weekNumber, year, date }) => {
    const params = {
      degree_id: degreeId,
      ...(weekNumber ? { week_number: weekNumber } : {}),
      ...(year ? { year } : {}),
      ...(date ? { date } : {}),
    };

    const res = await axiosClient.get("/attendances/weekly-sheet/pdf", {
      params,
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);

    // Open in a new tab or trigger link click if popup blocker intervenes
    const win = window.open(blobUrl, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {}
    }, 120000);

    return blobUrl;
  },

  /**
   * Download the weekly PDF file directly.
   */
  downloadWeeklyPdf: async ({ degreeId, weekNumber, year, date, filename }) => {
    const params = {
      degree_id: degreeId,
      download: 1,
      ...(weekNumber ? { week_number: weekNumber } : {}),
      ...(year ? { year } : {}),
      ...(date ? { date } : {}),
    };

    const res = await axiosClient.get("/attendances/weekly-sheet/pdf", {
      params,
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || `fiche_presence_classe_${degreeId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {}
    }, 60000);

    return blobUrl;
  },

  /**
   * Fallback direct URL generator with clean parameters (no undefined strings).
   */
  getPdfDownloadUrl: ({ degreeId, weekNumber, year, date, download = false }) => {
    const base = axiosClient.defaults.baseURL || "";
    const cleanBase = base.replace(/\/+$/, "");
    const params = { degree_id: String(degreeId) };
    if (weekNumber) params.week_number = String(weekNumber);
    if (year) params.year = String(year);
    if (date) params.date = String(date);
    if (download) params.download = "1";
    const qs = new URLSearchParams(params);
    return `${cleanBase}/attendances/weekly-sheet/pdf?${qs.toString()}`;
  },
};
