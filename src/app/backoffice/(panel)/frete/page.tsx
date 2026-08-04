import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { ShippingManager, type ShippingRow } from "@/components/backoffice/shipping-manager";

export const metadata: Metadata = { title: "Frete" };

export default async function FretePage() {
  await guardModule("frete");
  const rules = await db.shippingRule.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "asc" }] });
  const rows: ShippingRow[] = rules.map((r) => ({
    id: r.id, name: r.name, matchType: r.matchType, ufList: parseJson<string[]>(r.ufList, []),
    price: r.price, freeAbove: r.freeAbove, etaDays: r.etaDays, priority: r.priority, active: r.active,
  }));

  return (
    <>
      <PageHeader eyebrow="Logística" title="Frete" subtitle="Regras de frete por região usadas no cálculo do checkout." />
      <ShippingManager rules={rows} />
    </>
  );
}
