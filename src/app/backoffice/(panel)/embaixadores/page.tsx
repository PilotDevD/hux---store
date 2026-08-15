import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { EmbaixadoresManager, type AmbassadorRow } from "@/components/backoffice/embaixadores-manager";

export const metadata: Metadata = { title: "Embaixadores" };

export default async function EmbaixadoresPage() {
  await guardModule("embaixadores");

  const ambassadors = await db.ambassador.findMany({
    orderBy: { createdAt: "desc" },
    include: { coupon: { select: { id: true, code: true, value: true } } },
  });

  // usage pulled straight from the store's orders that used each coupon
  const couponIds = ambassadors.map((a) => a.couponId).filter(Boolean) as string[];
  const orders = couponIds.length
    ? await db.order.findMany({
        where: { couponId: { in: couponIds }, status: { not: "CANCELADO" } },
        select: { couponId: true, subtotal: true, discountTotal: true },
      })
    : [];

  const byCoupon = new Map<string, { uses: number; revenue: number }>();
  for (const o of orders) {
    if (!o.couponId) continue;
    const cur = byCoupon.get(o.couponId) ?? { uses: 0, revenue: 0 };
    cur.uses += 1;
    cur.revenue += o.subtotal - o.discountTotal;
    byCoupon.set(o.couponId, cur);
  }

  const rows: AmbassadorRow[] = ambassadors.map((a) => {
    const stats = a.couponId ? byCoupon.get(a.couponId) ?? { uses: 0, revenue: 0 } : { uses: 0, revenue: 0 };
    return {
      id: a.id, name: a.name, email: a.email, phone: a.phone,
      code: a.coupon?.code ?? "—", discountPct: a.coupon?.value ?? 0, cashbackPct: a.cashbackPct,
      active: a.active, notes: a.notes,
      uses: stats.uses, revenue: stats.revenue, cashback: Math.round(stats.revenue * (a.cashbackPct / 100)),
    };
  });

  return (
    <>
      <PageHeader eyebrow="Parcerias" title="Embaixadores" subtitle="Cupons de embaixadores com cashback — uso e cashback puxados direto das vendas da loja." />
      <EmbaixadoresManager ambassadors={rows} />
    </>
  );
}
