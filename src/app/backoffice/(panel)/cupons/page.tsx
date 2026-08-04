import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { CouponsManager, type CouponRow } from "@/components/backoffice/coupons-manager";

export const metadata: Metadata = { title: "Cupons" };

export default async function CuponsPage() {
  await guardModule("cupons");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id, code: c.code, description: c.description, type: c.type, value: c.value,
    minOrder: c.minOrder, maxUses: c.maxUses, usedCount: c.usedCount, perCustomerLimit: c.perCustomerLimit,
    active: c.active, startsAt: c.startsAt?.toISOString() ?? null, endsAt: c.endsAt?.toISOString() ?? null,
  }));

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Cupons" subtitle="Códigos de desconto e frete grátis para os clientes." />
      <CouponsManager coupons={rows} />
    </>
  );
}
