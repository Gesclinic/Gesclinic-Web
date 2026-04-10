import { ROLES } from "@/config/roles";

export function hasPermission(role, permission) {
  if (!ROLES[role]) return false;
  if (ROLES[role].permissions.includes("all")) return true;
  return ROLES[role].permissions.includes(permission);
}
