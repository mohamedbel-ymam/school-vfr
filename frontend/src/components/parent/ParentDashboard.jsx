import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { axiosClient } from "../../api/axios";
import TimetableApi from "../../services/api/admin/TimeTableApi";

// --------------- helpers ----------------------------------------------------
const unwrap          = (r) => r?.data?.data ?? r?.data ?? null;
const unwrapList      = (r) => r?.data?.data ?? r?.data ?? [];
const unwrapChildren  = (r) => r?.data?.data ?? r?.data?.children ?? r?.data ?? [];
const unwrapNotifs    = (r) => r?.data?.data ?? r?.data?.notifications ?? r?.data ?? [];

const getStart = (l) => l?.start_time ?? l?.starts_at ?? null;
const getEnd   = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const DAYS = [
  { label: "Lun", val: 1 }, { label: "Mar", val: 2 }, { label: "Mer", val: 3 },
  { label: "Jeu", val: 4 }, { label: "Ven", val: 5 }, { label: "Sam", val: 6 }, { label: "Dim", val: 7 },
];

// Tries a list of request functions until one succeeds (skips 404s)
async function firstOk(requestFns) {
  for (const fn of requestFns) {
    try {
      const res = await fn();
      return res;
    } catch (e) {
      const status = e?.response?.status;
      // ignore 404/405/403 and try next; rethrow for other errors
      if (![404, 405, 403].includes(status)) throw e;
    }
  }
  return null;
}
// ----------------------------------------------------------------------------

export default function ParentDashboard() {
  const { user } = useAuth();

  // children
  const [children, setChildren]   = useState([]);
  const [childId, setChildId]     = useState("");

  // timetable
  const [title, setTitle]         = useState("Enfant Emploi du temps");
  const [lessons, setLessons]     = useState([]);
  const [loadingKids, setLoadingKids] = useState(true);
  const [loadingTT, setLoadingTT] = useState(false);

  // notifications
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [adminNotifs, setAdminNotifs]     = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  // 1) Load linked children (try several endpoints)
  useEffect(() => {
    (async () => {
      try {
        const res = await firstOk([
          () => axiosClient.get("/parent/children", { params: { per_page: 200 } }),
          () => axiosClient.get("/parent/élèves", { params: { per_page: 200 } }),
          () => axiosClient.get("/me/children", { params: { per_page: 200 } }),
          () => axiosClient.get("/children", { params: { per_page: 200 } }),
          // very generic fallback (if your API nests under /v1 or similar, add it above)
        ]);
        const kids = res ? unwrapChildren(res) : [];
        setChildren(Array.isArray(kids) ? kids : []);
        if (kids?.length && !childId) setChildId(String(kids[0].id));
      } finally {
        setLoadingKids(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Load selected child's timetable (with fallbacks)
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingTT(true);
      try {
        const res = await firstOk([
          () => TimetableApi.parent?.({ child_id: childId }),
          () => axiosClient.get("/parent/timetable", { params: { child_id: childId } }),
          () => axiosClient.get(`/parent/children/${childId}/timetable`),
        ]);
        const payload = res ? unwrap(res) : null;

        if (Array.isArray(payload)) {
          setLessons(payload);
          setTitle(payload[0]?.timetable?.title ?? "Child Timetable");
        } else {
          setLessons(payload?.lessons ?? []);
          setTitle(payload?.timetable?.title ?? "Child Timetable");
        }
      } finally {
        setLoadingTT(false);
      }
    })();
  }, [childId]);

  // 3) Load notifications (teacher/admin) with graceful fallbacks
  useEffect(() => {
    (async () => {
      setLoadingNotifs(true);
      try {
        // Try dedicated parent endpoints first
        let tRes = await firstOk([
          () => axiosClient.get("/parent/notifications", { params: { from: "teacher", per_page: 50 } }),
          () => axiosClient.get("/notifications",        { params: { audience: "parent", from: "teacher", per_page: 50 } }),
          () => axiosClient.get("/notifications/teacher", { params: { per_page: 50 } }),
        ]);

        let aRes = await firstOk([
          () => axiosClient.get("/parent/notifications", { params: { from: "admin", per_page: 50 } }),
          () => axiosClient.get("/notifications",        { params: { audience: "parent", from: "admin", per_page: 50 } }),
          () => axiosClient.get("/notifications/admin",  { params: { per_page: 50 } }),
        ]);

        const tList = tRes ? unwrapNotifs(tRes) : [];
        const aList = aRes ? unwrapNotifs(aRes) : [];

        setTeacherNotifs(Array.isArray(tList) ? tList : []);
        setAdminNotifs(Array.isArray(aList) ? aList : []);
      } finally {
        setLoadingNotifs(false);
      }
    })();
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Parent header card */}
      <div className="relative overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900">
        <div className="p-4">
          <h1 className="text-xl font-semibold mb-3">Hi parent</h1>
          <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white dark:bg-gray-900">
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {user?.id}
                </th>
                <td className="px-6 py-4">
                  {user?.firstname} {user?.lastname}
                </td>
                <td className="px-6 py-4">{user?.email}</td>
                <td className="px-6 py-4">{user?.created_at}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Child selector + timetable */}
      <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="text-lg font-semibold">{title}</div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm font-medium">Select child:</label>
            <select
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              disabled={loadingKids || !children.length}
            >
              {children.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {(c.firstname && c.lastname) ? `${c.firstname} ${c.lastname}` : (c.name ?? `#${c.id}`)}
                </option>
              ))}
            </select>
            {loadingTT && <span className="text-xs text-gray-500">Loading timetable…</span>}
          </div>
        </div>

        {loadingKids ? (
          <div className="p-3 text-sm text-gray-500">Loading children…</div>
        ) : !children.length ? (
          <div className="p-3 text-sm text-gray-500">
            No linked students found. (Backend child endpoint not configured.)
          </div>
        ) : (
          <WeekGrid lessons={lessons} />
        )}
      </div>

      {/* Notifications */}
      <div className="grid md:grid-cols-2 gap-4">
        <NotificationsCard
          title="Teacher Notifications"
          items={teacherNotifs}
          loading={loadingNotifs}
          emptyMsg="No notifications from teachers."
        />
        <NotificationsCard
          title="Admin Notifications"
          items={adminNotifs}
          loading={loadingNotifs}
          emptyMsg="No notifications from admins."
        />
      </div>
    </div>
  );
}

// ----------------- Weekly grid (read-only) ---------------------------------
function WeekGrid({ lessons }) {
  const rowsByDay = useMemo(() => {
    const m = new Map(DAYS.map((d) => [d.val, []]));
    for (const l of lessons ?? []) {
      const day = Number(l.day_of_week);
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const sa = getStart(a), sb = getStart(b);
        if (sa && sb) return String(sa).localeCompare(String(sb));
        return (a.period ?? 0) - (b.period ?? 0);
      });
    }
    return m;
  }, [lessons]);

  return (
    <div className="grid grid-cols-7 gap-2 text-sm">
      {DAYS.map(({ label, val }) => (
        <div key={val} className="min-w-0">
          <div className="font-medium mb-1">{label}</div>
          <div className="space-y-1">
            {rowsByDay.get(val)?.map((l) => (
              <div
                key={l.id ?? `${val}-${l.subject_id}-${getStart(l) ?? l.period ?? "x"}`}
                className="rounded border p-2 bg-white/70 dark:bg-gray-800"
              >
                <div className="font-medium">
                  {l.subject?.name ?? "—"}{" "}
                  {getStart(l) && getEnd(l)
                    ? `(${getStart(l)}–${getEnd(l)})`
                    : l.period
                    ? `• Period ${l.period}`
                    : ""}
                </div>
                <div className="text-xs text-gray-500">
                  {l.teacher ? `By ${l.teacher.firstname} ${l.teacher.lastname}` : ""}
                  {(l.room?.name ?? l.room) ? ` • ${l.room?.name ?? l.room}` : ""}
                </div>
              </div>
            ))}
            {!rowsByDay.get(val)?.length && <div className="text-xs text-gray-400">—</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----------------- Notifications card --------------------------------------
function NotificationsCard({ title, items, loading, emptyMsg }) {
  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
      <div className="text-lg font-semibold mb-3">{title}</div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : !items?.length ? (
        <div className="text-sm text-gray-500">{emptyMsg}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id ?? `${n.type ?? "notif"}-${n.created_at ?? n.date ?? Math.random()}`}
              className="rounded border p-3 bg-white/70 dark:bg-gray-800"
            >
              <div className="text-sm font-medium">
                {n.title ?? n.subject ?? n.type ?? "Notification"}
              </div>
              {n.message || n.body ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {n.message ?? n.body}
                </div>
              ) : null}
              <div className="text-[11px] text-gray-400 mt-1">
                {n.created_at ?? n.date ?? ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
