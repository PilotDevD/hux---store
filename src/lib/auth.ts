import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { signSession, verifySession, type SessionClaims } from "./jwt";
import { canAccessModule } from "./access";
import type { ModuleId, Role } from "./enums";

const STAFF_COOKIE = process.env.AUTH_COOKIE_STAFF || "hux_staff_session";
const CUSTOMER_COOKIE = process.env.AUTH_COOKIE_CUSTOMER || "hux_customer_session";
const WEEK = 60 * 60 * 24 * 7;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// ------------------------------- passwords ---------------------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ------------------------------- staff -------------------------------------

export async function createStaffSession(userId: string, name: string, role: string) {
  const token = await signSession({ sub: userId, kind: "staff", name, role }, WEEK);
  (await cookies()).set(STAFF_COOKIE, token, { ...cookieOptions, maxAge: WEEK });
}

export async function destroyStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

async function readStaffClaims(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  return claims?.kind === "staff" ? claims : null;
}

export type StaffSession = {
  id: string;
  displayName: string;
  role: Role;
  permissions: string[];
  commissionPct: number;
};

/** Full staff user from DB (null if not logged / inactive). Request-cached. */
export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const claims = await readStaffClaims();
  if (!claims) return null;
  const user = await db.user.findUnique({ where: { id: claims.sub } });
  if (!user || !user.active) return null;
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(user.permissions);
  } catch {
    permissions = [];
  }
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role as Role,
    permissions,
    commissionPct: user.commissionPct,
  };
});

export async function requireStaff(): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) throw new Error("UNAUTHORIZED_STAFF");
  return staff;
}

export async function requireModule(moduleId: ModuleId | "config"): Promise<StaffSession> {
  const staff = await requireStaff();
  if (!canAccessModule(staff.role, staff.permissions, moduleId)) {
    throw new Error("FORBIDDEN_MODULE");
  }
  return staff;
}

// ------------------------------- customer ----------------------------------

export async function createCustomerSession(customerId: string, name: string) {
  const token = await signSession({ sub: customerId, kind: "customer", name }, WEEK);
  (await cookies()).set(CUSTOMER_COOKIE, token, { ...cookieOptions, maxAge: WEEK });
}

export async function destroyCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export type CustomerSession = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  if (claims?.kind !== "customer") return null;
  const customer = await db.customer.findUnique({ where: { id: claims.sub } });
  if (!customer || !customer.active) return null;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  };
});

export async function requireCustomer(): Promise<CustomerSession> {
  const customer = await getCustomer();
  if (!customer) throw new Error("UNAUTHORIZED_CUSTOMER");
  return customer;
}
