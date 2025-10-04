// src/router/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

/* Pages */
import Home         from "@/pages/Home.jsx";
import Notfound     from "@/pages/Notfound.jsx";            // file is Notfound.jsx (lowercase 'f')
import Login        from "@/pages/Login.jsx";
import Unauthorized from "@/pages/Unauthorized.jsx";

/* Layouts */
import Layout                  from "@/layouts/Layout.jsx";
import GuestLayout             from "@/layouts/GeustLayout.jsx";          // keep existing filename
import StudentDashboardLayout  from "@/layouts/StudentDashboardLayout.jsx";
import AdminDashboardLayout    from "@/layouts/AdminDashboardLayout.jsx";
import TeacherDashboardLayout  from "@/layouts/TeacherDashboardLayout.jsx";
import ParentDashboardLayout   from "@/layouts/ParentDashboardLayout.jsx";

/* Parent */
import ParentDashboard from "@/components/parent/ParentDashboard.jsx";     // folder 'Parent' has capital P
import ParentOverview  from "@/components/parent/ParentOveriew.jsx";       // filename is 'ParentOveriew.jsx'

/* Student */
import StudentDashboard from "@/components/student/StudentDashboard.jsx";
import StudentTimetable from "@/components/student/StudentTimeTable.jsx";

/* Teacher */
import TeacherDashboard from "@/components/teacher/TeacherDashboard.jsx";
import TeacherTimetable from "@/components/teacher/TeacherTimeTable.jsx";

/* Admin */
import AdminDashboard    from "@/components/admin/pages/AdminDashboard.jsx";
import ManageParents     from "@/components/admin/pages/ManageParents.jsx";
import ManageStudents    from "@/components/admin/pages/ManageStudents.jsx";
import ManageTeachers    from "@/components/admin/pages/ManageTeachers.jsx";
import ManageTimetables  from "@/components/admin/pages/ManageTimeTables.jsx"; // file is ManageTimeTables.jsx
import ManageEvents      from "@/components/admin/pages/ManageEvents.jsx";
import AdminsPage        from "@/components/admin/pages/AdminsPage.jsx";

/* Settings */
import AccountSettings from "@/components/settings/Account.jsx";

/* Events (non-admin) */
import StudentEvents from "@/components/student/StudentEvents.jsx";
import TeacherEvents from "@/components/teacher/TeacherEvents.jsx";
import ParentEvents  from "@/components/parent/ParentEvents.jsx";

/* Notifications */
import SendNotification  from "@/components/admin/pages/SendNotification.jsx";
import NotificationsPage from "@/components/notifications/NotificationsPage.jsx";

/* Documents */
import StudentDocuments from "@/components/student/StudentDocuments.jsx";
import TeacherDocuments from "@/components/teacher/TeacherDocuments.jsx";
import AdminDocuments   from "@/components/admin/pages/AdminDocuments.jsx";

/* Homework */
import StudentDevoirs from "@/components/student/StudentDevoirs.jsx";
import TeacherDevoirs from "@/components/teacher/TeacherDevoirs.jsx";
import AdminDevoirs   from "@/components/admin/pages/AdminDevoirs.jsx";

/* Placeholder */
import NotYet from "@/pages/NotYet.jsx"; // file is NotYet.jsx (capital Y)

/* ---------------- Route Constants ---------------- */

export const LOGIN_ROUTE                   = "/connexion";

// Student
export const STUDENT_DASHBOARD_ROUTE       = "/élève/tableau de bord";
export const STUDENT_DASHBOARD_PARAM_ROUTE = "/élève/tableau de bord/:degree";
export const STUDENT_SCHEDULE_ROUTE        = "/élève/emploi du temps";

// Teacher
export const TEACHER_DASHBOARD_ROUTE       = "/enseignant/tableau de bord";
export const TEACHER_SCHEDULE_ROUTE        = "/enseignant/emploi du temps";

// Parent
export const PARENT_DASHBOARD_ROUTE        = "/parent/tableau de bord";

// Admin
export const ADMIN_DASHBOARD_ROUTE         = "/admin/tableau de bord";
export const ADMIN_MANAGE_PARENTS_ROUTE    = "/admin/manage-parents";
export const ADMIN_MANAGE_STUDENTS_ROUTE   = "/admin/manage-élèves";
export const ADMIN_MANAGE_TEACHERS_ROUTE   = "/admin/manage-enseignants";
export const ADMIN_MANAGE_TIMETABLES_ROUTE = "/admin/manage-timetables";
export const ADMIN_MANAGE_EVENTS_ROUTE     = "/admin/manage-événements";

// Non-admin events
export const STUDENT_EVENTS_ROUTE = "/élève/événements";
export const TEACHER_EVENTS_ROUTE = "/enseignant/événements";
export const PARENT_EVENTS_ROUTE  = "/parent/événements";

// Documents
export const STUDENT_DOCS_ROUTE = "/élève/documents";
export const TEACHER_DOCS_ROUTE = "/enseignant/documents";
export const ADMIN_DOCS_ROUTE   = "/admin/documents";

// Homework
export const STUDENT_HW_ROUTE  = "/élève/devoirs";
export const TEACHER_HW_ROUTE  = "/enseignant/devoirs";
export const ADMIN_HW_ROUTE    = "/admin/devoirs";

// Admin extras
export const ADMIN_DEGREES_ROUTE  = "/admin/degrees";
export const ADMIN_SUBJECTS_ROUTE = "/admin/subjects";
export const ADMIN_COURSES_ROUTE  = "/admin/courses";
export const ADMIN_EXAMS_ROUTE    = "/admin/exams";
export const ADMIN_MESSAGES_ROUTE = "/admin/messages";
export const ADMIN_ROLES_ROUTE    = "/admin/roles";

// Teacher extras
export const TEACHER_COURSES_ROUTE = "/enseignant/courses";
export const TEACHER_EXAMS_ROUTE   = "/enseignant/exams";
export const TEACHER_GRADES_ROUTE  = "/enseignant/grades";
export const TEACHER_MSGS_ROUTE    = "/enseignant/messages";

// Student extras
export const STUDENT_COURSES_ROUTE = "/élève/courses";
export const STUDENT_GRADES_ROUTE  = "/élève/grades";
export const STUDENT_MSGS_ROUTE    = "/élève/messages";
export const STUDENT_EXAMS_ROUTE   = "/élève/exams";

/* ---------------- Helpers ---------------- */

export const redirectToDashboard = (roleType) => {
  switch (roleType) {
    case "admin":   return ADMIN_DASHBOARD_ROUTE;
    case "teacher": return TEACHER_DASHBOARD_ROUTE;
    case "student": return STUDENT_DASHBOARD_ROUTE;
    case "parent":  return PARENT_DASHBOARD_ROUTE;
    default:        return LOGIN_ROUTE;
  }
};

export const ROLE_PRIORITY = ["admin", "teacher", "student", "parent"];

export function startPathForUser(u) {
  const roles = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
  const top = ROLE_PRIORITY.find((r) => roles.includes(r));

  if (top === "admin")   return ADMIN_DASHBOARD_ROUTE;
  if (top === "teacher") return TEACHER_DASHBOARD_ROUTE;
  if (top === "student") return STUDENT_DASHBOARD_ROUTE;
  if (top === "parent")  return PARENT_DASHBOARD_ROUTE;

  return LOGIN_ROUTE;
}

/* ---------------- Guards ---------------- */

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement…</div>;
  if (!user) return <Navigate to={LOGIN_ROUTE} replace />;

  if (roles?.length) {
    const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement…</div>;
  if (user) return <Navigate to={startPathForUser(user)} replace />;
  return children;
}

/* ---------------- Router Definition ---------------- */

export const router = createBrowserRouter([
  // Public shell
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/unauthorized", element: <Unauthorized /> }, // public
      { path: "*", element: <Notfound /> },
    ],
  },

  // Guest (Login)
  {
    element: (
      <GuestOnly>
        <GuestLayout />
      </GuestOnly>
    ),
    children: [{ path: LOGIN_ROUTE, element: <Login /> }],
  },

  // Student (Protected)
  {
    path: "/élève",
    element: (
      <Guard roles={["student"]}>
        <StudentDashboardLayout />
      </Guard>
    ),
    children: [
      { index: true,                     element: <Navigate to="tableau de bord" replace /> },
      { path: "tableau de bord",         element: <StudentDashboard /> },
      { path: "tableau de bord/:degree", element: <StudentDashboard /> },
      { path: "emploi du temps",         element: <StudentTimetable /> },
      { path: "événements",              element: <StudentEvents /> },
      { path: "paramètres",              element: <AccountSettings /> },
      { path: "notifications",           element: <NotificationsPage /> },
      { path: "documents",               element: <StudentDocuments /> },
      { path: "devoirs",                 element: <StudentDevoirs /> },
      // placeholders
      { path: "courses",                 element: <NotYet /> },
      { path: "grades",                  element: <NotYet /> },
      { path: "messages",                element: <NotYet /> },
      { path: "exams",                   element: <NotYet /> },
    ],
  },

  // Admin (Protected)
  {
    path: "/admin",
    element: (
      <Guard roles={["admin"]}>
        <AdminDashboardLayout />
      </Guard>
    ),
    children: [
      { path: "tableau de bord",    element: <AdminDashboard /> },
      { path: "admins",             element: <AdminsPage /> },
      { path: "manage-parents",     element: <ManageParents /> },
      { path: "manage-élèves",      element: <ManageStudents /> },
      { path: "manage-enseignants", element: <ManageTeachers /> },
      { path: "manage-timetables",  element: <ManageTimetables /> }, // correct filename
      { path: "manage-événements",  element: <ManageEvents /> },
      { path: "notifications",      element: <SendNotification /> },
      { path: "documents",          element: <AdminDocuments /> },
      { path: "devoirs",            element: <AdminDevoirs /> },
      { path: "paramètres",         element: <AccountSettings /> },
      // placeholders
      { path: "degrees",            element: <NotYet /> },
      { path: "subjects",           element: <NotYet /> },
      { path: "courses",            element: <NotYet /> },
      { path: "exams",              element: <NotYet /> },
      { path: "messages",           element: <NotYet /> },
      { path: "roles",              element: <NotYet /> },
    ],
  },

  // Teacher (Protected)
  {
    path: "/enseignant",
    element: (
      <Guard roles={["teacher", "admin"]}>
        <TeacherDashboardLayout />
      </Guard>
    ),
    children: [
      { index: true, element: <Navigate to="tableau de bord" replace /> },
      { path: "tableau de bord", element: <TeacherDashboard /> },
      { path: "emploi du temps", element: <TeacherTimetable /> },
      { path: "événements",      element: <TeacherEvents /> },
      { path: "paramètres",      element: <AccountSettings /> },
      { path: "notifications",   element: <NotificationsPage /> },
      { path: "documents",       element: <TeacherDocuments /> },
      { path: "devoirs",         element: <TeacherDevoirs /> },
      // placeholders
      { path: "courses",         element: <NotYet /> },
      { path: "exams",           element: <NotYet /> },
      { path: "grades",          element: <NotYet /> },
      { path: "messages",        element: <NotYet /> },
    ],
  },

  // Parent (Protected)
  {
    path: "/parent",
    element: (
      <Guard roles={["parent"]}>
        <ParentDashboardLayout />
      </Guard>
    ),
    children: [
      { index: true,             element: <ParentOverview /> },
      { path: "tableau de bord", element: <ParentDashboard /> },
      { path: "événements",      element: <ParentEvents /> },
      { path: "paramètres",      element: <AccountSettings /> },
    ],
  },
]);

export default router;
