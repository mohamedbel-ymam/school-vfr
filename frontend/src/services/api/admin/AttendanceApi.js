// src/services/api/AttendanceApi.js
import { axiosClient } from "../../../api/axios";

/**
 * This file serves BOTH:
 * - Student: AttendanceApi.me({ period })
 * - Admin dashboard: AttendanceApi.summary({ period, degree_id }) + AttendanceApi.list({ degree_id, period })
 *
 * Admin uses existing endpoints:
 * - GET /admin/attendance/weekly?degree_id=&week_start=YYYY-MM-DD
 * - GET /admin/attendance/monthly?degree_id=&month=YYYY-MM
 */

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

function addMonths(yyyyMm, delta) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m - 1) + delta, 1));
  return d.toISOString().slice(0, 7);
}

function emptyAgg() {
  return { absences: 0, justified_absences: 0, presences: 0 };
}

function statusToBucket(status) {
  if (status === "presence") return "presences";
  if (status === "absence") return "absences";
  if (status === "absence_justifiee") return "justified_absences";
  return null;
}

/**
 * Aggregates raw AttendanceRecord rows into per-student counters.
 * Expected record shape (from your controller):
 * record.student: { id, firstname, lastname, ... }
 * record.status: "presence"|"absence"|"absence_justifiee"
 * record.session.session_date: "YYYY-MM-DD"
 */
function aggregateRecords(records = []) {
  const byStudent = new Map();
  const totals = emptyAgg();

  for (const r of records || []) {
    const sid = r?.student_id ?? r?.student?.id;
    if (!sid) continue;

    const bucket = statusToBucket(r?.status);
    if (!bucket) continue;

    if (!byStudent.has(sid)) {
      byStudent.set(sid, {
        id: sid,
        firstname: r?.student?.firstname ?? "",
        lastname: r?.student?.lastname ?? "",
        attendance: emptyAgg(),
      });
    }

    const row = byStudent.get(sid);
    row.attendance[bucket] += 1;
    totals[bucket] += 1;
  }

  const items = Array.from(byStudent.values());
  // sort: most absences+justified first
  items.sort((a, b) => {
    const A = (a.attendance.absences || 0) + (a.attendance.justified_absences || 0);
    const B = (b.attendance.absences || 0) + (b.attendance.justified_absences || 0);
    return B - A;
  });

  const denom = totals.absences + totals.justified_absences + totals.presences;
  const attendance_rate = denom ? Math.round((totals.presences / denom) * 100) : 0;

  return {
    totals: { ...totals, attendance_rate },
    items,
    top: items.slice(0, 8).map((it) => ({
      student: { id: it.id, firstname: it.firstname, lastname: it.lastname },
      absences: it.attendance.absences,
      justified_absences: it.attendance.justified_absences,
      presences: it.attendance.presences,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Admin fetchers (weekly/monthly are real endpoints)                          */
/* -------------------------------------------------------------------------- */

async function fetchAdminWeekly({ degree_id, week_start }) {
  const res = await axiosClient.get("/admin/attendance/weekly", {
    params: { degree_id, week_start },
  });
  return res?.data?.records ?? [];
}

async function fetchAdminMonthly({ degree_id, month }) {
  const res = await axiosClient.get("/admin/attendance/monthly", {
    params: { degree_id, month },
  });
  return res?.data?.records ?? [];
}

/**
 * summary({ period, degree_id })
 * period: "week" | "month" | "overall"
 *
 * - week   => current week
 * - month  => current month
 * - overall => aggregates last 6 months (cheap & useful)
 */
async function summary({ period = "month", degree_id } = {}) {
  const deg = degree_id ? Number(degree_id) : undefined;

  let records = [];

  if (period === "week") {
    records = await fetchAdminWeekly({ degree_id: deg, week_start: startOfWeekMonday(new Date()) });
  } else if (period === "month") {
    records = await fetchAdminMonthly({ degree_id: deg, month: monthKey(new Date()) });
  } else {
    // "overall" => last 6 months aggregated
    const base = monthKey(new Date());
    const months = [0, -1, -2, -3, -4, -5].map((d) => addMonths(base, d));
    const chunks = await Promise.all(months.map((m) => fetchAdminMonthly({ degree_id: deg, month: m })));
    records = chunks.flat();
  }

  return aggregateRecords(records);
}

/**
 * list({ degree_id, period })
 * Returns { items: [{ id, firstname, lastname, attendance: {absences, justified_absences, presences} }] }
 */
async function list({ degree_id, period = "month" } = {}) {
  const deg = degree_id ? Number(degree_id) : undefined;

  let records = [];
  if (period === "week") {
    records = await fetchAdminWeekly({ degree_id: deg, week_start: startOfWeekMonday(new Date()) });
  } else if (period === "month") {
    records = await fetchAdminMonthly({ degree_id: deg, month: monthKey(new Date()) });
  } else {
    const base = monthKey(new Date());
    const months = [0, -1, -2, -3, -4, -5].map((d) => addMonths(base, d));
    const chunks = await Promise.all(months.map((m) => fetchAdminMonthly({ degree_id: deg, month: m })));
    records = chunks.flat();
  }

  const agg = aggregateRecords(records);
  return { items: agg.items };
}

/* -------------------------------------------------------------------------- */
/* Student endpoint (keep your existing logic)                                 */
/* -------------------------------------------------------------------------- */
/**
 * If you already implemented student route like:
 * GET /eleve/attendance/me?period=week|month|overall
 * keep using it.
 */
async function me({ period = "month" } = {}) {
  const res = await axiosClient.get("/eleve/attendance/me", { params: { period } });
  return res?.data;
}

/* -------------------------------------------------------------------------- */
/* Exported API                                                                */
/* -------------------------------------------------------------------------- */
export const AttendanceApi = {
  me,
  summary,
  list,
};

export default AttendanceApi;
