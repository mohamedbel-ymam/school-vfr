// src/components/parent/ParentDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { axiosClient } from "../../api/axios";
import TimetableApi from "../../services/api/admin/TimeTableApi";
import {
  Users,
  Calendar,
  AlertTriangle,
  Award,
  Clock,
  ChevronRight,
  UserCheck,
  BellRing,
  BookOpen,
} from "lucide-react";

/* ------------------------------ helpers ------------------------------ */
const unwrap         = (r) => r?.data?.data ?? r?.data ?? null;
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
  const [title, setTitle]       = useState("Emploi du temps de l’élève");
  const [lessons, setLessons]   = useState([]);
  const [loadingTT, setLoadingTT] = useState(false);

  // notifications
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [adminNotifs, setAdminNotifs]     = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  // absence summary
  const [absences, setAbsences] = useState(null);
  const [loadingAbs, setLoadingAbs] = useState(false);

  // student badge
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

        const urlChild = searchParams.get("child");
        if (urlChild && list.some(k => String(k.id) === String(urlChild))) {
          setChildId(String(urlChild));
        } else if (list.length && !childId) {
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
  }, []);

  // keep URL in sync when childId changes
  useEffect(() => {
    if (!childId) return;
    const current = searchParams.get("child");
    if (current !== String(childId)) {
      const sp = new URLSearchParams(searchParams);
      sp.set("child", String(childId));
      setSearchParams(sp, { replace: false });
    }
  }, [childId, searchParams, setSearchParams]);

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

  /* ---------------- load notifications ---------------- */
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

  /* ---------------- absences summary ---------------- */
  useEffect(() => {
    if (!childId) return;
    (async () => {
      setLoadingAbs(true);
      try {
        const res = await firstOk([
          () => axiosClient.get(`/parent/children/${childId}/absences/summary`),
          () => axiosClient.get("/absences", { params: { student_id: childId, scope: "this_year" } }),
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

  /* ---------------- badge ---------------- */
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

  const parentName = user?.firstname && user?.lastname
    ? `${user.firstname} ${user.lastname}`
    : user?.name || "Parent";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              <Users className="h-4 w-4" />
              <span>Espace Famille • Suivi Pédagogique</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Bonjour, {parentName} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Consultez en temps réel l'emploi du temps, l'assiduité et les annonces scolaires de vos enfants.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              Année Scolaire 2025–2026
            </span>
          </div>
        </div>

        {/* Multi-child selector pills */}
        {children.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border/60">
            <div className="text-xs font-semibold text-muted-foreground mb-2.5">
              Sélectionnez un élève pour afficher ses informations :
            </div>
            <div className="flex flex-wrap gap-2">
              {children.map((c) => {
                const isSelected = String(c.id) === String(childId);
                const name = (c.firstname && c.lastname)
                  ? `${c.firstname} ${c.lastname}`
                  : (c.name ?? `Élève #${c.id}`);
                const degree = c.degree?.name || c.degree_name || "";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChildId(String(c.id))}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm scale-100"
                        : "border-border bg-muted/40 text-foreground hover:bg-muted"
                    }`}
                  >
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span>{name}</span>
                    {degree && (
                      <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {degree}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Child KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Élève sélectionné</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg font-bold text-foreground truncate">
            {loadingKids ? "Chargement…" : (childFullName || "—")}
          </div>
          <div className="text-[11px] text-muted-foreground">Dossier actif</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Absences constatées</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {loadingAbs ? "…" : (absences !== null ? absences : "0")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {(absences === 0 || absences === null) ? "Assiduité exemplaire" : "À justifier auprès de l'école"}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Séances hebdomadaires</span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {loadingTT ? "…" : lessons.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Créneaux d'appui programmés</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Statut Takwa</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-foreground truncate">
            {badge?.label || badge?.name || "Inscrit régulier"}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Assiduité suivie par scan
          </div>
        </div>
      </div>

      {/* Timetable Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Planning des séances de soutien pour {childFullName || "l'élève"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/parent/emploi du temps")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors"
          >
            <span>Afficher la grille complète</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div>
          {loadingKids || loadingTT ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Chargement de l'emploi du temps…
            </div>
          ) : !children.length ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucun élève rattaché à votre compte.
            </div>
          ) : (
            <WeekGrid lessons={lessons} />
          )}
        </div>
      </div>

      {/* Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationsCard
          title="Communications des Enseignants"
          icon={BookOpen}
          items={teacherNotifs}
          loading={loadingNotifs}
          emptyMsg="Aucun message récent de l'équipe pédagogique."
        />
        <NotificationsCard
          title="Annonces Administratives"
          icon={BellRing}
          items={adminNotifs}
          loading={loadingNotifs}
          emptyMsg="Aucune communication administrative en cours."
        />
      </div>
    </div>
  );
}

/* =========================== subcomponents =========================== */

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
        return (Number(a.period ?? 0)) - (Number(b.period ?? 0));
      });
      m.set(k, arr);
    }
    return m;
  }, [lessons]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
      {DAYS.map(({ label, full, val }) => (
        <div key={val} className="p-3 rounded-2xl border border-border/80 bg-background/50 space-y-2">
          <div className="font-bold text-foreground text-center pb-1.5 border-b border-border/60">
            {label}
            <span className="hidden sm:inline text-muted-foreground font-normal text-[11px] ml-1">
              ({full.slice(0, 3)})
            </span>
          </div>

          <div className="space-y-2">
            {rowsByDay.get(val)?.map((l, idx) => {
              const subject = l.subject?.name ?? "Séance";
              const teacher = l.teacher ? `${l.teacher.firstname ?? ""} ${l.teacher.lastname ?? ""}`.trim() : "";
              const room    = l.room?.name ?? l.room ?? "";
              const timeStr = (getStart(l) && getEnd(l))
                ? `${getStart(l)}–${getEnd(l)}`
                : (l.period ? `Créneau ${l.period}` : "");

              return (
                <div
                  key={l.id ?? `${val}-${l.subject_id ?? "s"}-${getStart(l) ?? l.period ?? idx}`}
                  className="rounded-xl border border-border p-2 bg-card space-y-1 shadow-2xs"
                >
                  <div className="font-bold text-foreground truncate">{subject}</div>
                  {timeStr && (
                    <div className="text-[10px] text-primary font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{timeStr}</span>
                    </div>
                  )}
                  {(teacher || room) && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {teacher ? `Pr. ${teacher}` : ""}{room ? ` • ${room}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
            {!rowsByDay.get(val)?.length && (
              <div className="text-center py-4 text-[11px] text-muted-foreground/60">—</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsCard({ title, icon: Icon, items, loading, emptyMsg }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Chargement…</div>
      ) : !items?.length ? (
        <div className="text-xs text-muted-foreground py-6 text-center">{emptyMsg}</div>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((n, i) => (
            <li
              key={n.id ?? `${n.type ?? "notif"}-${n.created_at ?? n.date ?? i}`}
              className="rounded-2xl border border-border p-3.5 bg-background/50 space-y-1"
            >
              <div className="text-xs font-bold text-foreground">
                {n.title ?? n.subject ?? n.type ?? "Communication"}
              </div>
              {(n.message || n.body) && (
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {n.message ?? n.body}
                </div>
              )}
              {n.created_at && (
                <div className="text-[10px] text-muted-foreground/70 font-mono">
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
