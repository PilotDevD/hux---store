import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { EncomendasManager, type BackorderRow } from "@/components/backoffice/encomendas-manager";

export const metadata: Metadata = { title: "Encomendas" };

export default async function EncomendasPage() {
  await guardModule("encomendas");
  const backorders = await db.backorder.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const rows: BackorderRow[] = backorders.map((b) => ({
    id: b.id, brand: b.brand, productType: b.productType, modelName: b.modelName,
    size: b.size, color: b.color, qty: b.qty, customerName: b.customerName,
    customerPhone: b.customerPhone, expectedDate: b.expectedDate?.toISOString() ?? null,
    estimatedPrice: b.estimatedPrice, notes: b.notes, status: b.status,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Encomendas"
        subtitle="Pedidos de peças fora de estoque ou sob medida, por cliente."
      />
      <EncomendasManager backorders={rows} />
    </>
  );
}
