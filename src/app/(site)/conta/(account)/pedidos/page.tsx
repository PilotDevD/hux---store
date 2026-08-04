import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { listCustomerOrders } from "@/lib/order-queries";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Meus pedidos" };

export default async function OrdersPage() {
  const customer = await requireCustomer();
  const orders = await listCustomerOrders(customer.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Histórico</p>
        <h1 className="headline text-3xl md:text-4xl">Meus pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid size-14 place-items-center rounded-full border border-line">
            <ShoppingBag size={22} className="text-faint" />
          </div>
          <p className="text-muted">Nenhum pedido ainda.</p>
          <Link href="/loja" className="btn btn-primary mt-1">Ir para a loja</Link>
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {orders.map((o) => (
            <Link
              key={o.number}
              href={`/conta/pedidos/${o.number}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{o.number}</p>
                <p className="text-xs text-muted">
                  {formatDate(o.createdAt)} · {o.itemCount} {o.itemCount === 1 ? "item" : "itens"}
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
  );
}
