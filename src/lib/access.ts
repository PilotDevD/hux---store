import type { Role, ModuleId } from "./enums";

// Access rule (spec ch.2):
//   admin   -> everything, including "config"
//   gerente -> everything operational EXCEPT "config" (hardcoded full access)
//   vendedor-> only modules listed in their permissions
export function canAccessModule(
  role: Role,
  permissions: string[],
  moduleId: ModuleId | "config",
): boolean {
  if (role === "ADMIN") return true;
  if (moduleId === "config") return false; // config is admin-only
  if (role === "GERENTE") return true;
  return permissions.includes(moduleId);
}
