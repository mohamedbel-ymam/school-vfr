// src/router/paths.js

/* ===================== AUTH ===================== */
export const LOGIN_ROUTE = "/connexion";
export const UNAUTHORIZED_ROUTE = "/unauthorized";

/* ===================== ROLE PRIORITY ===================== */

/* ===================== STUDENT ===================== */
export const STUDENT_BASE_ROUTE                = "/élève";
export const STUDENT_DASHBOARD_ROUTE           = "/élève/tableau de bord";
export const STUDENT_DASHBOARD_PARAM_ROUTE     = "/élève/tableau de bord/:degree";
export const STUDENT_SCHEDULE_ROUTE            = "/élève/emploi du temps";
export const STUDENT_EVENTS_ROUTE              = "/élève/événements";
export const STUDENT_DOCS_ROUTE                = "/élève/documents";
export const STUDENT_HW_ROUTE                  = "/élève/devoirs";
export const STUDENT_COURSES_ROUTE             = "/élève/courses";
export const STUDENT_GRADES_ROUTE              = "/élève/grades";
export const STUDENT_MSGS_ROUTE                = "/élève/messages";
export const STUDENT_EXAMS_ROUTE               = "/élève/exams";

/* Student tests */
export const STUDENT_TESTS_ROUTE               = "/élève/tests";
export const STUDENT_TEST_START_ROUTE          = "/élève/tests/:id/start";
export const STUDENT_TEST_ATTEMPT_ROUTE        = "/élève/tests/attempt/:id";
export const STUDENT_TEST_RESULT_ROUTE         = "/élève/tests/resultat/:id";

/* ===================== TEACHER ===================== */
export const TEACHER_BASE_ROUTE                = "/enseignant";
export const TEACHER_DASHBOARD_ROUTE           = "/enseignant/tableau de bord";
export const TEACHER_SCHEDULE_ROUTE            = "/enseignant/emploi du temps";
export const TEACHER_EVENTS_ROUTE              = "/enseignant/événements";
export const TEACHER_DOCS_ROUTE                = "/enseignant/documents";
export const TEACHER_HW_ROUTE                  = "/enseignant/devoirs";
export const TEACHER_COURSES_ROUTE             = "/enseignant/courses";
export const TEACHER_EXAMS_ROUTE               = "/enseignant/exams";
export const TEACHER_GRADES_ROUTE              = "/enseignant/grades";
export const TEACHER_MSGS_ROUTE                = "/enseignant/messages";

/* Teacher tests */
export const TEACHER_TESTS_ROUTE               = "/enseignant/tests";
export const TEACHER_TEST_CREATE_ROUTE         = "/enseignant/tests/create";
export const TEACHER_TEST_QUESTIONS_ROUTE      = "/enseignant/tests/:id/questions";
export const TEACHER_TEST_ASSIGN_ROUTE         = "/enseignant/tests/:id/assign";
export const TEACHER_TEST_REVIEW_ROUTE         = "/enseignant/tests/:id/review";
export const TEACHER_TEST_RESULTS_ROUTE        = "/enseignant/tests/:id/results";

/* ===================== PARENT ===================== */
export const PARENT_BASE_ROUTE                 = "/parent";
export const PARENT_DASHBOARD_ROUTE            = "/parent/tableau de bord";
export const PARENT_EVENTS_ROUTE               = "/parent/événements";
export const PARENT_SCHEDULE_ROUTE             = "/parent/emploi du temps";

/* ===================== BOURSIER ===================== */
export const BOURSIER_BASE_ROUTE               = "/boursier";
export const BOURSIER_DASHBOARD_ROUTE          = "/boursier/tableau de bord";

/* ===================== ADMIN ===================== */
export const ADMIN_BASE_ROUTE                  = "/admin";
export const ADMIN_DASHBOARD_ROUTE             = "/admin/tableau de bord";

export const ADMIN_MANAGE_PARENTS_ROUTE        = "/admin/manage-parents";
export const ADMIN_MANAGE_STUDENTS_ROUTE       = "/admin/manage-élèves";
export const ADMIN_MANAGE_TEACHERS_ROUTE       = "/admin/manage-enseignants";
export const ADMIN_MANAGE_BOURSIERS_ROUTE      = "/admin/manage-boursiers";
export const ADMIN_MANAGE_TIMETABLES_ROUTE     = "/admin/manage-timetables";
export const ADMIN_MANAGE_EVENTS_ROUTE         = "/admin/manage-événements";
export const ADMIN_MANAGE_GROUPS_ROUTE         = "/admin/groupes";
export const ADMIN_WAITING_LIST_ROUTE          = "/admin/waiting-list";

export const ADMIN_DOCS_ROUTE                  = "/admin/documents";
export const ADMIN_HW_ROUTE                    = "/admin/devoirs";
export const ADMIN_PRESENCE_ROUTE              = "/admin/presences";
export const ADMIN_NOTIFICATIONS_ROUTE         = "/admin/notifications";
export const ADMIN_SETTINGS_ROUTE              = "/admin/paramètres";

/* Admin tests */
export const ADMIN_TESTS_ROUTE                 = "/admin/tests";
export const ADMIN_TEST_DETAILS_ROUTE          = "/admin/tests/:id";

/* Admin extras */
export const ADMIN_DEGREES_ROUTE               = "/admin/degrees";
export const ADMIN_SUBJECTS_ROUTE              = "/admin/subjects";
export const ADMIN_COURSES_ROUTE               = "/admin/courses";
export const ADMIN_EXAMS_ROUTE                 = "/admin/exams";
export const ADMIN_MESSAGES_ROUTE              = "/admin/messages";

/* ===================== PUBLIC ===================== */
export const HOME_ROUTE                        = "/";
export const WAITING_LIST_PUBLIC_ROUTE         = "/waiting-list";

// Role priority
export const ROLE_PRIORITY = ["admin", "teacher", "student", "parent", "boursier"];

// 🔁 Used by guards + login redirect
export function startPathForUser(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
    ? [user.role]
    : [];

  const top = ROLE_PRIORITY.find((r) => roles.includes(r));

  switch (top) {
    case "admin":   return ADMIN_DASHBOARD_ROUTE;
    case "teacher": return TEACHER_DASHBOARD_ROUTE;
    case "student": return STUDENT_DASHBOARD_ROUTE;
    case "parent":  return PARENT_DASHBOARD_ROUTE;
    case "boursier": return BOURSIER_DASHBOARD_ROUTE;
    default:        return LOGIN_ROUTE;
  }
}
