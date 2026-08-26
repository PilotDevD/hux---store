import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { getBrandNames } from "@/lib/brands";
import { getCustomerOptions } from "@/lib/customers";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { VendasManager, type VariantOption } from "@/components/backoffice/vendas-manager";
import { SalesExplorer, type SaleRow } from "@/components/backoffice/sales-explorer";
import { Store, Globe, Receipt } from "lucide-react";

export const metadata: Metadata = { title: "Vendas" };

const PAID = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];

export default async function VendasPage() {
  await guardModule("vendas");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [allSales, sellers, monthPaid, commissionOrders, variants, customers, brandNames] = await Promise.all([
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        customer: { select: { name: true } },
        items: { select: { brand: true, productName: true } },
      },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, displayName: true, commissionPct: true, role: true }, orderBy: { displayName: "asc" } }),
    db.order.findMany({
      where: { paymentStatus: "CONFIRMADO", status: { in: PAID }, OR: [{ paidAt: { gte: monthStart } }, { AND: [{ paidAt: null }, { createdAt: { gte: monthStart } }] }] },
      select: { channel: true, subtotal: true, discountTotal: true },
    }),
    db.order.findMany({
      where: { paymentStatus: "CONFIRMADO", status: { in: PAID }, soldByUserId: { not: null }, OR: [{ paidAt: { gte: monthStart } }, { AND: [{ paidAt: null }, { createdAt: { gte: monthStart } }] }] },
      select: { soldByUserId: true, soldByName: true, subtotal: true, discountTotal: true },
    }),
    db.productVariant.findMany({
      where: { active: true, product: { active: true } },
      include: { product: { select: { name: true, brand: true, type: true, basePrice: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getCustomerOptions(),
    getBrandNames(),
  ]);

  // commission per seller this month
  const pctById = new Map(sellers.map((s) => [s.id, s.commissionPct]));
  const commMap = new Map<string, { name: string; count: number; net: number }>();
  for (const o of commissionOrders) {
    if (!o.soldByUserId) continue;
    const cur = commMap.get(o.soldByUserId) ?? { name: o.soldByName ?? "—", count: 0, net: 0 };
    cur.count += 1;
    cur.net += o.subtotal - o.discountTotal;
    commMap.set(o.soldByUserId, cur);
  }
  const commissions = [...commMap.entries()].map(([id, v]) => {
    const pct = pctById.get(id) ?? 0;
    return { name: v.name, count: v.count, net: v.net, pct, commission: Math.round(v.net * (pct / 100)) };
  }).sort((a, b) => b.net - a.net);

  const online = monthPaid.filter((o) => o.channel === "ONLINE");
  const manual = monthPaid.filter((o) => o.channel === "MANUAL");
  const rev = (arr: typeof monthPaid) => arr.reduce((s, o) => s + (o.subtotal - o.discountTotal), 0);

  const variantOptions: VariantOption[] = variants.map((v) => ({
    id: v.id, stock: v.stock, price: v.priceOverride ?? v.product.basePrice,
    label: `${v.product.name} · ${SIZE_LABELS[v.size as Size] ?? v.size} · ${v.color} · ${PRODUCT_TYPE_LABELS[v.product.type as ProductType] ?? v.product.type} (${v.sku})`,
  }));

  const saleRows: SaleRow[] = allSales.map((o) => ({
    number: o.number,
    channel: o.channel,
    customerName: o.customer?.name ?? parseJson<{ name?: string }>(o.customerSnapshot, {}).name ?? "Balcão",
    seller: o.soldByName ?? "—",
    sellerId: o.soldByUserId,
    paymentMethod: o.paymentMethod,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    products: o.items.length === 0 ? "—" : o.items.length > 1 ? `${o.items[0].productName} +${o.items.length - 1}` : o.items[0].productName,
    brands: [...new Set(o.items.map((i) => i.brand))],
  }));

  return (
    <>
      <PageHeader eyebrow="Ponto de venda" title="Vendas" subtitle="Registre vendas físicas, filtre e acompanhe o mix físico × online do mês." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Vendas físicas (mês)" value={String(manual.length)} hint={formatCents(rev(manual))} icon={Store} tone="positive" />
        <StatCard label="Vendas online (mês)" value={String(online.length)} hint={formatCents(rev(online))} icon={Globe} tone="info" />
        <StatCard label="Total de vendas (mês)" value={String(monthPaid.length)} hint={formatCents(rev(monthPaid))} icon={Receipt} />
      </div>

      <VendasManager variants={variantOptions} sellers={sellers.map((s) => ({ id: s.id, name: s.displayName }))} customers={customers} />

      <div className="mt-8">
        <p className="eyebrow mb-4">Todas as vendas</p>
        <SalesExplorer sales={saleRows} sellers={sellers.map((s) => ({ id: s.id, name: s.displayName }))} brands={brandNames} />
      </div>

      <div className="mt-8 card overflow-hidden">
        <div className="border-b border-line px-5 py-4"><p className="eyebrow">Comissões do mês (por vendedor)</p></div>
        {commissions.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Nenhuma venda com vendedor atribuído neste mês.</p>
        ) : (
          <div className="divide-y divide-line">
            <div className="hidden grid-cols-[2fr_0.8fr_1fr_0.6fr_1fr] gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
              <span>Vendedor</span><span>Vendas</span><span>Receita</span><span>%</span><span>Comissão</span>
            </div>
            {commissions.map((c) => (
              <div key={c.name} className="grid grid-cols-2 items-center gap-4 px-5 py-3 md:grid-cols-[2fr_0.8fr_1fr_0.6fr_1fr]">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="hidden text-sm text-muted md:block">{c.count}</span>
                <span className="text-sm text-muted">{formatCents(c.net)}</span>
                <span className="hidden text-sm text-muted md:block">{c.pct}%</span>
                <span className="text-sm font-semibold text-brand">{formatCents(c.commission)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="border-t border-line px-5 py-2 text-xs text-faint">O % de comissão é configurado por vendedor em Configurações. Uma aba de <strong>Relatórios</strong> traz visões mais completas.</p>
      </div>
    </>
  );
}
