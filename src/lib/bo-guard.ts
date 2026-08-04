import "server-only";
import { redirect } from "next/navigation";
import { getStaff, type StaffSession } from "./auth";
import { canAccessModule } from "./access";
import type { ModuleId } from "./enums";

/** Ensure a logged staff member can access a module, else redirect. */
export async function guardModule(moduleId: ModuleId | "config"): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) redirect("/backoffice/login");
  if (!canAccessModule(staff.role, staff.permissions, moduleId)) {
    redirect("/backoffice?denied=1");
  }
  return staff;
}
