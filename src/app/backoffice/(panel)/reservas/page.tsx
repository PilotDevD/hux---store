import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { PageHeader } from "@/components/backoffice/bo-ui";
import {
  ReservasManager, type ReservationRow, type VariantOption,
} from "@/components/backoffice/reservas-manager";

export const metadata: Metadata = { title: "Reservas" };

export default async function ReservasPage() {
  await guardModule("reservas");

  const [reservations, variants] = await Promise.all([
    db.reservation.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    db.productVariant.findMany({
      where: { active: true, product: { active: true } },
      include: { product: { select: { name: true, brand: true, type: true, basePrice: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const variantOptions: VariantOption[] = variants.map((v) => ({
    id: v.id,
    brand: v.product.brand,
    stock: v.stock,
    price: v.priceOverride ?? v.product.basePrice,
    label: `${v.product.name} · ${SIZE_LABELS[v.size as Size] ?? v.size} · ${v.color} · ${PRODUCT_TYPE_LABELS[v.product.type as ProductType] ?? v.product.type} (${v.sku})`,
  }));

  const rows: ReservationRow[] = reservations.map((r) => ({
    id: r.id, productName: r.productName, brand: r.brand, size: r.size, color: r.color,
    qty: r.qty, unitPrice: r.unitPrice, customerName: r.customerName, customerPhone: r.customerPhone,
    notes: r.notes, status: r.status, orderNumber: r.orderNumber, createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Reservas"
        subtitle="Provisione peças do estoque para clientes e feche a venda com um clique."
      />
      <ReservasManager reservations={rows} variants={variantOptions} />
    </>
  );
}
