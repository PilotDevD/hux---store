import "server-only";
import { db } from "./db";

export type AmbassadorLite = { id: string; name: string; couponId: string | null; cashbackPct: number; email: string | null };

/** Find an active ambassador whose e-mail matches the customer's e-mail. */
export async function ambassadorByEmail(email: string | null | undefined): Promise<AmbassadorLite | null> {
  const e = (email ?? "").trim();
  if (!e) return null;
  const amb = await db.ambassador.findFirst({
    where: { active: true, email: { equals: e, mode: "insensitive" } },
    select: { id: true, name: true, couponId: true, cashbackPct: true, email: true },
  });
  return amb;
}

/** Cashback balance (cents) = earned on confirmed sales − already redeemed. */
export async function ambassadorBalance(amb: AmbassadorLite): Promise<number> {
  let earned = 0;
  if (amb.couponId) {
    const orders = await db.order.findMany({
      where: { couponId: amb.couponId, paymentStatus: "CONFIRMADO", status: { not: "CANCELADO" } },
      select: { subtotal: true, discountTotal: true },
    });
    earned = orders.reduce((s, o) => s + Math.round((o.subtotal - o.discountTotal) * (amb.cashbackPct / 100)), 0);
  }
  const redeemedRows = await db.order.findMany({
    where: { cashbackAmbassadorId: amb.id, status: { not: "CANCELADO" } },
    select: { cashbackUsed: true },
  });
  const redeemed = redeemedRows.reduce((s, o) => s + o.cashbackUsed, 0);
  return Math.max(0, earned - redeemed);
}

/** Balances for a set of customer e-mails (for the sale picker). */
export async function ambassadorBalancesByEmail(): Promise<{ email: string; balance: number }[]> {
  const ambs = await db.ambassador.findMany({
    where: { active: true, email: { not: null } },
    select: { id: true, name: true, couponId: true, cashbackPct: true, email: true },
  });
  const out: { email: string; balance: number }[] = [];
  for (const a of ambs) {
    if (!a.email) continue;
    const bal = await ambassadorBalance(a);
    if (bal > 0) out.push({ email: a.email, balance: bal });
  }
  return out;
}
