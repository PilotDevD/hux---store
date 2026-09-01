import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { getCustomerOptions } from "@/lib/customers";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { EncomendasManager, type BackorderRow } from "@/components/backoffice/encomendas-manager";

export const metadata: Metadata = { title: "Encomendas" };

export default async function EncomendasPage() {
  await guardModule("encomendas");
  const [backorders, customers, products] = await Promise.all([
    db.backorder.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    getCustomerOptions(),
    db.product.findMany({ select: { name: true, modelName: true }, orderBy: { name: "asc" } }),
  ]);

  // Existing model/product names to suggest in the encomenda form.
  const models = [...new Set(products.flatMap((p) => [p.modelName, p.name].filter(Boolean) as string[]))].sort();

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
      <EncomendasManager backorders={rows} customers={customers} models={models} />
    </>
  );
}
