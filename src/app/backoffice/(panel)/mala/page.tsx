import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { MalaManager, type MalaRow, type VariantOption } from "@/components/backoffice/mala-manager";

export const metadata: Metadata = { title: "Mala HUX" };

export default async function MalaPage() {
  await guardModule("mala");

  const [malas, variants] = await Promise.all([
    db.mala.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { items: true } }),
    db.productVariant.findMany({
      where: { active: true, product: { active: true } },
      include: { product: { select: { name: true, brand: true, type: true, basePrice: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const variantOptions: VariantOption[] = variants.map((v) => ({
    id: v.id, brand: v.product.brand, stock: v.stock, price: v.priceOverride ?? v.product.basePrice,
    label: `${v.product.name} · ${SIZE_LABELS[v.size as Size] ?? v.size} · ${v.color} · ${PRODUCT_TYPE_LABELS[v.product.type as ProductType] ?? v.product.type} (${v.sku})`,
  }));

  const rows: MalaRow[] = malas.map((m) => ({
    id: m.id, customerName: m.customerName, customerPhone: m.customerPhone, notes: m.notes,
    status: m.status, createdAt: m.createdAt.toISOString(), expiresAt: m.expiresAt.toISOString(),
    orderNumber: m.orderNumber,
    items: m.items.map((i) => ({ id: i.id, productName: i.productName, brand: i.brand, size: i.size, color: i.color, qty: i.qty, unitPrice: i.unitPrice, decision: i.decision })),
  }));

  return (
    <>
      <PageHeader eyebrow="Condicional" title="Mala HUX" subtitle="Peças enviadas para o cliente experimentar em casa. Provisiona estoque e controla o acerto." />
      <MalaManager malas={rows} variants={variantOptions} />
    </>
  );
}
