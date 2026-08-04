import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MessageCircle, ShoppingBag } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { formatDate, onlyDigits, initials } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClienteDetail({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("clientes");
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { id: true } } } },
      addresses: true,
    },
  });
  if (!customer) notFound();

  const paid = customer.orders.filter((o) => o.paymentStatus === "CONFIRMADO");
  const spent = paid.reduce((s, o) => s + o.total, 0);
  const ticket = paid.length ? Math.round(spent / paid.length) : 0;
  const phone = onlyDigits(customer.phone ?? "");

  return (
    <>
      <Link href="/backoffice/clientes" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-elevated font-display text-lg text-orange">{initials(customer.name)}</div>
        <div>
          <h1 className="headline text-3xl">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
            <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-ink-soft hover:text-orange"><Mail size={14} /> {customer.email}</a>
            {phone && <a href={`https://wa.me/55${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-ink-soft hover:text-positive"><MessageCircle size={14} /> {customer.phone}</a>}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos pagos" value={String(paid.length)} icon={ShoppingBag} />
        <StatCard label="Total gasto" value={formatCents(spent)} tone="positive" />
        <StatCard label="Ticket médio" value={formatCents(ticket)} tone="info" />
      </div>

      <PageHeader title="Histórico de pedidos" />
      {customer.orders.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Nenhum pedido ainda.</p>
      ) : (
        <div className="card divide-y divide-line">
          {customer.orders.map((o) => (
            <Link key={o.number} href={`/backoffice/pedidos/${o.number}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-elevated">
              <div>
                <p className="font-mono text-sm font-semibold">{o.number}</p>
                <p className="text-xs text-muted">{formatDate(o.createdAt)} · {o.items.length} itens</p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="hidden font-semibold sm:block">{formatCents(o.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
