// src/router/paths.js

export const LOGIN_ROUTE = "/connexion";

// Dashboards
export const ADMIN_DASHBOARD_ROUTE    = "/admin/tableau de bord";
export const TEACHER_DASHBOARD_ROUTE  = "/enseignant/tableau de bord";
export const STUDENT_DASHBOARD_ROUTE  = "/élève/tableau de bord";
export const PARENT_DASHBOARD_ROUTE   = "/parent/tableau de bord";
export const BOURSIER_DASHBOARD_ROUTE = "/boursier/tableau de bord";

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
