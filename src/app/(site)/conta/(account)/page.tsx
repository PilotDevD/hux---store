import type { Metadata } from "next";
import Link from "next/link";
import { Package, Bell, Wallet, ArrowRight, ShoppingBag } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountHome() {
  const customer = await requireCustomer();

  const [orders, spentAgg, unread, recent] = await Promise.all([
    db.order.count({ where: { customerId: customer.id, status: { not: "CANCELADO" } } }),
    db.order.aggregate({
      where: { customerId: customer.id, paymentStatus: "CONFIRMADO" },
      _sum: { total: true },
    }),
    db.notification.count({ where: { customerId: customer.id, read: false } }),
    db.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { items: { select: { id: true } } },
    }),
  ]);

  const stats = [
    { icon: Package, label: "Pedidos", value: String(orders) },
    { icon: Wallet, label: "Total investido", value: formatCents(spentAgg._sum.total ?? 0) },
    { icon: Bell, label: "Não lidas", value: String(unread) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-1">Painel</p>
        <h1 className="headline text-3xl md:text-4xl">Olá, {customer.name.split(" ")[0]} 👋</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon size={20} className="text-orange" />
            <p className="mt-3 font-display text-3xl">{s.value}</p>
            <p className="data-label mt-1 text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-xl">Pedidos recentes</h2>
          <Link href="/conta/pedidos" className="text-sm font-semibold text-orange hover:underline">
            Ver todos
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <div className="grid size-14 place-items-center rounded-full border border-line">
              <ShoppingBag size={22} className="text-faint" />
            </div>
            <p className="text-muted">Você ainda não fez nenhum pedido.</p>
            <Link href="/loja" className="btn btn-primary mt-1">Começar a comprar</Link>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {recent.map((o) => (
              <Link
                key={o.number}
                href={`/conta/pedidos/${o.number}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{o.number}</p>
                  <p className="text-xs text-muted">
                    {formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? "item" : "itens"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} />
                  <span className="hidden font-semibold sm:block">{formatCents(o.total)}</span>
                  <ArrowRight size={16} className="text-faint" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
