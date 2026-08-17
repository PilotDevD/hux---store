"use server";

import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";

/**
 * Lightweight poll used by the backoffice sale notifier. Returns the most recent
 * order plus the total order count so the client can detect a brand-new sale
 * (online or física) and play a sound alert.
 */
export async function pollNewSalesAction(): Promise<{
  ok: boolean;
  latestId?: string;
  number?: string;
  total?: number;
  channel?: string;
  count?: number;
}> {
  const staff = await getStaff();
  if (!staff) return { ok: false };
  const [latest, count] = await Promise.all([
    db.order.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, total: true, channel: true },
    }),
    db.order.count(),
  ]);
  return {
    ok: true,
    latestId: latest?.id,
    number: latest?.number,
    total: latest?.total,
    channel: latest?.channel,
    count,
  };
}
