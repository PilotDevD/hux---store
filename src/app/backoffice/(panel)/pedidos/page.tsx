import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson, formatDate } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/enums";
import { PageHeader, EmptyState } from "@/components/backoffice/bo-ui";
import { OrderStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function OrdersListPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("pedidos");
  const sp = await searchParams;
  const status = first(sp.status);
  const q = first(sp.q)?.trim();

  const where: Record<string, unknown> = {};
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) where.status = status;
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { email: { contains: q } } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true } },
      items: { select: { id: true } },
    },
  });

  const customerName = (o: (typeof orders)[number]) =>
    o.customer?.name ?? parseJson<{ name?: string }>(o.customerSnapshot, {}).name ?? "Balcão";

  const filters = [{ id: "", label: "Todos" }, ...ORDER_STATUSES.map((s) => ({ id: s, label: ORDER_STATUS_LABELS[s] }))];

  return (
    <>
      <PageHeader eyebrow="Operação" title="Pedidos" subtitle="Confirme pagamentos e gerencie o fluxo de entrega." />

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = (status ?? "") === f.id;
          const href = f.id ? `/backoffice/pedidos?status=${f.id}` : "/backoffice/pedidos";
          return (
            <Link
              key={f.id || "all"}
              href={href}
              className={cn(
                "chip transition-colors",
                active ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nenhum pedido" hint="Pedidos da loja aparecerão aqui." />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_0.6fr_1fr_1fr_auto] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
            <span>Número</span><span>Cliente</span><span>Data</span><span>Itens</span><span>Total</span><span>Status</span><span></span>
          </div>
          <div className="divide-y divide-line">
            {orders.map((o) => (
              <Link
                key={o.number}
                href={`/backoffice/pedidos/${o.number}`}
                className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-elevated md:grid-cols-[1.2fr_1.5fr_1fr_0.6fr_1fr_1fr_auto] md:gap-4"
              >
                <span className="font-mono text-sm font-semibold">{o.number}</span>
                <span className="truncate text-sm text-ink-soft">{customerName(o)}</span>
                <span className="hidden text-sm text-muted md:block">{formatDate(o.createdAt)}</span>
                <span className="hidden text-sm text-muted md:block">{o.items.length}</span>
                <span className="text-sm font-semibold">{formatCents(o.total)}</span>
                <span><OrderStatusBadge status={o.status} /></span>
                <ArrowRight size={15} className="hidden text-faint md:block" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
