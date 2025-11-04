// src/components/parent/ParentDashboard.jsx
// src/components/parent/ParentDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; // <-- changed
import { useAuth } from "../../context/AuthContext.jsx";
import { axiosClient } from "../../api/axios";
import TimetableApi from "../../services/api/admin/TimeTableApi";

/* ------------------------------ helpers ------------------------------ */
const unwrap           = (r) => r?.data?.data ?? r?.data ?? null;
const unwrapChildren   = (r) => r?.data?.data ?? r?.data?.children ?? r?.data ?? [];
const unwrapNotifs     = (r) => r?.data?.data ?? r?.data?.notifications ?? r?.data ?? [];
const getStart         = (l) => l?.start_time ?? l?.starts_at ?? null;
const getEnd           = (l) => l?.end_time   ?? l?.ends_at   ?? null;

const DAYS = [
  { label: "Lun", full: "Lundi",     val: 1 },
  { label: "Mar", full: "Mardi",     val: 2 },
  { label: "Mer", full: "Mercredi",  val: 3 },
  { label: "Jeu", full: "Jeudi",     val: 4 },
  { label: "Ven", full: "Vendredi",  val: 5 },
  { label: "Sam", full: "Samedi",    val: 6 },
  { label: "Dim", full: "Dimanche",  val: 7 },
];

function firstOk(requestFns) {
  return (async () => {
    for (const fn of requestFns) {
      try { return await fn(); }
      catch (e) {
        const st = e?.response?.status;
        if (![404,405,403].includes(st)) throw e;
      }
    }
    return null;
  })();
}

/* ============================= main ============================= */

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // children
  const [children, setChildren] = useState([]);
  const [childId, setChildId]   = useState(searchParams.get("child") || "");
  const [loadingKids, setLoadingKids] = useState(true);

  // timetable
  const [title, setTitle]       = useState("Emploi du temps de l’enfant");
  const [lessons, setLessons]   = useState([]);
  const [loadingTT, setLoadingTT] = useState(false);

  // notifications
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [adminNotifs, setAdminNotifs]     = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  // absence summary
  const [absences, setAbsences] = useState(null);
  const [loadingAbs, setLoadingAbs] = useState(false);

  // student badge (placeholder)
  const [badge, setBadge] = useState(null);
  const [loadingBadge, setLoadingBadge] = useState(false);

  /* ---------------- load children ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await firstOk([
          () => axiosClient.get("/parent/children", { params: { per_page: 200 } }),
          () => axiosClient.get("/me/children",     { params: { per_page: 200 } }),
          () => axiosClient.get("/children",        { params: { per_page: 200 } }),
        ]);
        const kids = res ? unwrapChildren(res) : [];
        const list = Array.isArray(kids) ? kids : [];
        setChildren(list);

        // boot child selection:
        const urlChild = searchParams.get("child");
        if (urlChild && list.some(k => String(k.id) === String(urlChild))) {
          setChildId(String(urlChild));
        } else if (list.length && !childId) {
          // fall back to first child and sync URL
          const first = String(list[0].id);
          setChildId(first);
          const sp = new URLSearchParams(searchParams);
          sp.set("child", first);
          setSearchParams(sp, { replace: true });
        }
      } finally {
        setLoadingKids(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL in sync when childId changes (e.g., from <select>)
  useEffect(() => {
    if (!childId) return;
    const current = searchParams.get("child");
    if (current !== String(childId)) {
      const sp = new URLSearchParams(searchParams);
      sp.set("child", String(childId));
      setSearchParams(sp, { replace: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  /* --------- load selected child's timetable --------- */
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
          setTitle(payload[0]?.timetable?.title ?? "Emploi du temps");
        } else {
          setLessons(payload?.lessons ?? []);
          setTitle(payload?.timetable?.title ?? "Emploi du temps");
        }
      } finally {
        setLoadingTT(false);
      }
    })();
  }, [childId]);

  /* ---------------- load notifications (both) ---------------- */
  useEffect(() => {
    (async () => {
      setLoadingNotifs(true);
      try {
        const [tRes, aRes] = await Promise.all([
          firstOk([
            () => axiosClient.get("/parent/notifications", { params: { from: "teacher", per_page: 50 } }),
            () => axiosClient.get("/notifications",        { params: { audience: "parent", from: "teacher", per_page: 50 } }),
            () => axiosClient.get("/notifications/teacher", { params: { per_page: 50 } }),
          ]),
          firstOk([
            () => axiosClient.get("/parent/notifications", { params: { from: "admin", per_page: 50 } }),
            () => axiosClient.get("/notifications",        { params: { audience: "parent", from: "admin", per_page: 50 } }),
            () => axiosClient.get("/notifications/admin",  { params: { per_page: 50 } }),
          ]),
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

  /* ---------------- absences summary (soft fallback) ---------------- */
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingAbs(true);
      try {
        const res = await firstOk([
          () => axiosClient.get(`/parent/children/${childId}/absences/summary`),
          () => axiosClient.get("/absences", { params: { student_id: childId, scope: "this_year" } }),
          // as a last resort (may be forbidden for parent): admin endpoint filtered
          () => axiosClient.get("/admin/attendance", { params: { q: String(childId), per_page: 1 } }),
        ]);
        const data = res ? unwrap(res) : null;
        const count = typeof data?.count === "number"
          ? data.count
          : (Array.isArray(data) ? data.length : null);
        setAbsences(count);
      } catch {
        setAbsences(null);
      } finally {
        setLoadingAbs(false);
      }
    })();
  }, [childId]);

  /* ---------------- badge (placeholder) ---------------- */
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingBadge(true);
      try {
        const res = await firstOk([
          () => axiosClient.get(`/parent/children/${childId}/badge`),
          () => axiosClient.get("/badges", { params: { student_id: childId, latest: 1 } }),
        ]);
        const data = res ? unwrap(res) : null;
        setBadge(data ?? null);
      } catch {
        setBadge(null);
      } finally {
        setLoadingBadge(false);
      }
    })();
  }, [childId]);

  const selectedChild = children.find((c) => String(c.id) === String(childId));
  const childFullName =
    selectedChild
      ? `${selectedChild.firstname ?? ""} ${selectedChild.lastname ?? ""}`.trim() || selectedChild.name || `#${selectedChild.id}`
      : "";

  // keep your UI (unchanged except <select> onChange also updates URL via setChildId)
  return (
    <div className="p-4 space-y-6">
      {/* Parent info */}
      <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden">
        <div className="p-4">
          <h1 className="text-xl font-semibold mb-3">Bienvenue 👋</h1>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase bg-muted/40">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Créé le</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2">{user?.id}</td>
                  <td className="px-4 py-2">{user?.firstname} {user?.lastname}</td>
                  <td className="px-4 py-2">{user?.email}</td>
                  <td className="px-4 py-2">{user?.created_at}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Child selector + quick stats + open timetable */}
      <div className="rounded-2xl border p-4 bg-card text-card-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-lg font-semibold">{title}</div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm font-medium">Choisir l’enfant :</label>
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={childId || ""}
              onChange={(e) => setChildId(e.target.value)}
              disabled={loadingKids || !children.length}
            >
              {children.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {(c.firstname && c.lastname) ? `${c.firstname} ${c.lastname}` : (c.name ?? `#${c.id}`)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => navigate("/parent/emploi-du-temps")}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted/60"
              title="Ouvrir l’emploi du temps complet"
            >
              Ouvrir l’emploi du temps
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoStat label="Élève" value={loadingKids ? "Chargement…" : (childFullName || "—")} />
          <InfoStat label="Absences" value={loadingAbs ? "Chargement…" : (absences ?? "—")} hint="(total année / période — à brancher)" />
          <InfoStat label="Badge" value={loadingBadge ? "Chargement…" : (badge?.label ?? badge?.name ?? "—")} hint="(niveau/couleur à brancher)" />
          <InfoStat label="Séances cette semaine" value={lessons?.length ?? 0} />
        </div>

        <div className="mt-4">
          {loadingKids ? (
            <div className="p-3 text-sm text-muted-foreground">Chargement des enfants…</div>
          ) : !children.length ? (
            <div className="p-3 text-sm text-muted-foreground">Aucun enfant rattaché.</div>
          ) : (
            <WeekGrid lessons={lessons} />
          )}
          {loadingTT && <div className="mt-2 text-xs text-muted-foreground">Mise à jour de l’emploi du temps…</div>}
        </div>
      </div>

      {/* Notifications */}
      <div className="grid md:grid-cols-2 gap-4">
        <NotificationsCard title="Notifications des enseignants" items={teacherNotifs} loading={loadingNotifs} emptyMsg="Aucune notification enseignant." />
        <NotificationsCard title="Notifications de l’administration" items={adminNotifs} loading={loadingNotifs} emptyMsg="Aucune notification administration." />
      </div>
    </div>
  );
}

/* ----- subcomponents (unchanged) ----- */
// ... keep your InfoStat, WeekGrid, NotificationsCard as-is


/* =========================== subcomponents =========================== */

function InfoStat({ label, value, hint }) {
  return (
    <div className="rounded-xl border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
    </div>
  );
}

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
        // fallback by period number if time missing
        return (Number(a.period ?? 0)) - (Number(b.period ?? 0));
      });
      m.set(k, arr);
    }
    return m;
  }, [lessons]);

  return (
    <div className="grid grid-cols-7 gap-2 text-sm">
      {DAYS.map(({ label, val }) => (
        <div key={val} className="min-w-0">
          <div className="font-medium mb-1">{label}</div>
          <div className="space-y-1">
            {rowsByDay.get(val)?.map((l, idx) => {
              const subject = l.subject?.name ?? "—";
              const teacher = l.teacher ? `${l.teacher.firstname ?? ""} ${l.teacher.lastname ?? ""}`.trim() : "";
              const room    = l.room?.name ?? l.room ?? "";
              const timeStr = (getStart(l) && getEnd(l))
                ? `(${getStart(l)}–${getEnd(l)})`
                : (l.period ? `• Créneau ${l.period}` : "");

              return (
                <div
                  key={l.id ?? `${val}-${l.subject_id ?? "s"}-${getStart(l) ?? l.period ?? idx}`}
                  className="rounded-xl border p-2 bg-background"
                >
                  <div className="font-medium">
                    {subject} {timeStr && <span className="text-muted-foreground">{timeStr}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {teacher ? `Par ${teacher}` : ""}{room ? ` • ${room}` : ""}
                  </div>
                </div>
              );
            })}
            {!rowsByDay.get(val)?.length && <div className="text-xs text-muted-foreground">—</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsCard({ title, items, loading, emptyMsg }) {
  return (
    <div className="rounded-2xl border p-4 bg-card text-card-foreground">
      <div className="text-lg font-semibold mb-3">{title}</div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !items?.length ? (
        <div className="text-sm text-muted-foreground">{emptyMsg}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n, i) => (
            <li
              key={n.id ?? `${n.type ?? "notif"}-${n.created_at ?? n.date ?? i}`}
              className="rounded-xl border p-3 bg-muted/30"
            >
              <div className="text-sm font-medium">
                {n.title ?? n.subject ?? n.type ?? "Notification"}
              </div>
              {n.message || n.body ? (
                <div className="text-sm text-foreground/80">
                  {n.message ?? n.body}
                </div>
              ) : null}
              <div className="text-[11px] text-muted-foreground mt-1">
                {n.created_at ?? n.date ?? ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
