import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  PRODUCT_TYPE_LABELS, SIZE_LABELS, PAYMENT_METHOD_LABELS, SALE_CHANNEL_LABELS,
  BRANDS, MANUAL_PAYMENT_METHODS, SALE_CHANNELS,
  type ProductType, type Size,
} from "@/lib/enums";
import { PageHeader, StatCard, EmptyState } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { VendasManager, type VariantOption } from "@/components/backoffice/vendas-manager";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Store, Globe, Receipt } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Vendas" };

const PAID = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];
type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VendasPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("vendas");
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const seller = first(sp.seller);
  const brand = first(sp.brand);
  const method = first(sp.metodo);
  const channel = first(sp.canal);
  const de = first(sp.de);
  const ate = first(sp.ate);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // ---- filtered sales query ----
  const where: Prisma.OrderWhereInput = {};
  const AND: Prisma.OrderWhereInput[] = [];
  if (channel) where.channel = channel;
  if (seller) where.soldByUserId = seller;
  if (method) where.paymentMethod = method;
  if (brand) AND.push({ items: { some: { brand } } });
  if (de || ate) {
    const range: Prisma.DateTimeFilter = {};
    if (de) range.gte = new Date(`${de}T00:00:00`);
    if (ate) range.lte = new Date(`${ate}T23:59:59`);
    where.createdAt = range;
  }
  if (q) AND.push({
    OR: [
      { number: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { soldByName: { contains: q, mode: "insensitive" } },
      { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
    ],
  });
  if (AND.length) where.AND = AND;

  const [filteredSales, sellers, monthPaid, commissionOrders, variants] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { name: true } },
        items: { select: { brand: true, productName: true, qty: true } },
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

  // filtered results summary
  const filteredTotal = filteredSales.reduce((s, o) => s + o.total, 0);
  const anyFilter = !!(q || seller || brand || method || channel || de || ate);

  const customerName = (o: (typeof filteredSales)[number]) =>
    o.customer?.name ?? parseJson<{ name?: string }>(o.customerSnapshot, {}).name ?? "Balcão";
  const productsSummary = (o: (typeof filteredSales)[number]) => {
    if (o.items.length === 0) return "—";
    const first = o.items[0].productName;
    const more = o.items.length - 1;
    return more > 0 ? `${first} +${more}` : first;
  };

  return (
    <>
      <PageHeader eyebrow="Ponto de venda" title="Vendas" subtitle="Registre vendas físicas, filtre e acompanhe o mix físico × online do mês." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Vendas físicas (mês)" value={String(manual.length)} hint={formatCents(rev(manual))} icon={Store} tone="positive" />
        <StatCard label="Vendas online (mês)" value={String(online.length)} hint={formatCents(rev(online))} icon={Globe} tone="info" />
        <StatCard label="Total de vendas (mês)" value={String(monthPaid.length)} hint={formatCents(rev(monthPaid))} icon={Receipt} />
      </div>

      <VendasManager variants={variantOptions} sellers={sellers.map((s) => ({ id: s.id, name: s.displayName }))} />

      {/* ---- Filtered sales explorer ---- */}
      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Todas as vendas</p>
            <p className="mt-1 text-sm text-muted">
              {filteredSales.length} venda(s){filteredSales.length === 200 ? "+" : ""} · {formatCents(filteredTotal)}
              {anyFilter ? " no filtro atual" : ""}
            </p>
          </div>
        </div>

        <BoFilterBar
          searchPlaceholder="Buscar por venda, cliente, vendedor ou produto/modelo…"
          dateRange
          selects={[
            { param: "canal", label: "Canal", options: SALE_CHANNELS.map((c) => ({ value: c, label: SALE_CHANNEL_LABELS[c] })) },
            { param: "seller", label: "Vendedor", options: sellers.map((s) => ({ value: s.id, label: s.displayName })) },
            { param: "brand", label: "Marca", options: BRANDS.map((b) => ({ value: b, label: b })) },
            { param: "metodo", label: "Pagamento", options: MANUAL_PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })) },
          ]}
        />

        {filteredSales.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma venda encontrada" hint="Ajuste os filtros ou registre uma nova venda física." />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[1.1fr_1.5fr_1fr_0.9fr_0.9fr_0.9fr_auto] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
              <span>Venda</span><span>Cliente / produto</span><span>Vendedor</span><span>Data</span><span>Pgto</span><span>Total</span><span></span>
            </div>
            <div className="divide-y divide-line">
              {filteredSales.map((o) => (
                <div key={o.number} className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-[1.1fr_1.5fr_1fr_0.9fr_0.9fr_0.9fr_auto] md:gap-4">
                  <span className="flex flex-col">
                    <span className="font-mono text-sm font-semibold">{o.number}</span>
                    <span className={`w-fit rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium ${o.channel === "MANUAL" ? "bg-positive/10 text-positive" : "bg-info/10 text-info"}`}>
                      {SALE_CHANNEL_LABELS[o.channel] ?? o.channel}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink-soft">{customerName(o)}</span>
                    <span className="block truncate font-mono text-xs text-faint">{productsSummary(o)}</span>
                  </span>
                  <span className="hidden truncate text-sm text-muted md:block">{o.soldByName ?? "—"}</span>
                  <span className="hidden text-sm text-muted md:block">{formatDate(o.createdAt)}</span>
                  <span className="hidden text-xs text-muted md:block">{PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{formatCents(o.total)}</span>
                    <span className="md:hidden"><OrderStatusBadge status={o.status} /></span>
                  </span>
                  <span className="flex items-center justify-end gap-3">
                    <Link href={`/backoffice/pedidos/${o.number}`} className="text-xs text-ink-soft hover:text-orange hover:underline">gerenciar</Link>
                    <Link href={`/backoffice/recibo/${o.number}`} target="_blank" className="text-xs text-orange hover:underline">recibo</Link>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <p className="border-t border-line px-5 py-2 text-xs text-faint">O % de comissão é configurado por vendedor em Configurações. Vendas físicas e de mala/reserva registram o vendedor.</p>
      </div>
    </>
  );
}
