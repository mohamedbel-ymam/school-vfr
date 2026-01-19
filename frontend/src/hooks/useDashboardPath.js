import { useUserContext } from "../context/UserContext";

export default function useDashboardPath() {
  const { user } = useUserContext();

  if (!user) return "/";

  const roles = user.roles || [];

  if (roles.includes("superadmin") || roles.includes("admin")) {
    return "/admin/dashboard";
  }
  if (roles.includes("teacher")) {
    return "/teacher/dashboard";
  }
  if (roles.includes("parent")) {
    return "/parent/dashboard";
  }
  if (roles.includes("student")) {
    return "/student/dashboard";
  }

  return "/";
}
