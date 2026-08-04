import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { StockTable, type StockRow } from "@/components/backoffice/stock-table";
import { Boxes, AlertTriangle, PackageX } from "lucide-react";

export const metadata: Metadata = { title: "Estoque" };

type SP = Record<string, string | string[] | undefined>;

export default async function EstoquePage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("estoque");
  const sp = await searchParams;
  const onlyLow = sp.baixo === "1";

  const variants = await db.productVariant.findMany({
    where: { active: true, product: { active: true }, ...(onlyLow ? { stock: { lte: 3 } } : {}) },
    include: { product: { select: { name: true, brand: true } } },
    orderBy: [{ stock: "asc" }],
  });

  const rows: StockRow[] = variants.map((v) => ({
    variantId: v.id,
    productName: v.product.name,
    brand: v.product.brand,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stock,
  }));

  const totalUnits = rows.reduce((s, r) => s + r.stock, 0);
  const totalValue = variants.reduce((s, v) => s + v.stock * v.cost, 0);
  const low = rows.filter((r) => r.stock > 0 && r.stock <= 3).length;
  const out = rows.filter((r) => r.stock === 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Estoque"
        subtitle={onlyLow ? "Mostrando apenas estoque baixo (≤3)." : "Ajuste entradas e saídas por variante."}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Unidades" value={String(totalUnits)} icon={Boxes} />
        <StatCard label="Valor em custo" value={formatCents(totalValue)} icon={Boxes} tone="info" />
        <StatCard label="Estoque baixo" value={String(low)} icon={AlertTriangle} tone="warning" />
        <StatCard label="Esgotados" value={String(out)} icon={PackageX} tone="negative" />
      </div>
      <StockTable rows={rows} />
    </>
  );
}
