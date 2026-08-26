import "server-only";
import { db } from "./db";

/** Active customers for backoffice pickers (name / phone / email). */
export function getCustomerOptions() {
  return db.customer.findMany({
    where: { active: true },
    select: { id: true, name: true, phone: true, email: true },
    orderBy: { name: "asc" },
  });
}
