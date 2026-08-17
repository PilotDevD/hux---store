import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle, Mail, User, CreditCard, FileText } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { getOrderForStaff } from "@/lib/order-queries";
import { formatDate, formatDateTime, onlyDigits } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/enums";
import { OrderStatusBadge, Badge } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderSummary } from "@/components/orders/order-summary";
import { OrderActions } from "@/components/backoffice/order-actions";

export const metadata: Metadata = { title: "Pedido" };

export default async function BoOrderDetail({ params }: { params: Promise<{ number: string }> }) {
  await guardModule("pedidos");
  const { number } = await params;
  const order = await getOrderForStaff(number);
  if (!order) notFound();

  const phone = onlyDigits(order.customer.phone ?? "");
  const waMsg = encodeURIComponent(
    `Olá ${order.customer.name.split(" ")[0]}! Sobre seu pedido ${order.number} na HUX:`,
  );
  const paid = order.paymentStatus === "CONFIRMADO";

  return (
    <>
      <Link href="/backoffice/pedidos" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar aos pedidos
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Pedido</p>
          <h1 className="font-display text-3xl md:text-4xl">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">Criado em {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <OrderTimeline status={order.status} events={order.events} />
          <OrderSummary order={order} />
        </div>

        <div className="space-y-6">
          <OrderActions number={order.number} status={order.status} paymentMethod={order.paymentMethod} />

          <a
            href={`/backoffice/recibo/${order.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost w-full justify-center"
          >
            <FileText size={16} /> Emitir recibo
          </a>

          {/* Payment */}
          <div className="card p-5">
            <p className="eyebrow mb-3 flex items-center gap-2"><CreditCard size={13} /> Pagamento</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Método</span>
              <span className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Status</span>
              <Badge tone={paid ? "success" : order.paymentStatus === "ESTORNADO" ? "danger" : "warning"}>
                {order.paymentStatus}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">Valor</span>
              <span className="font-display text-lg text-orange">{formatCents(order.total)}</span>
            </div>
            {order.paidAt && <p className="mt-2 text-xs text-faint">Pago em {formatDateTime(order.paidAt)}</p>}

            {order.installments.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                <p className="data-label text-muted">Parcelas</p>
                {order.installments.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {order.installments.length > 1 ? `${inst.seq}/${order.installments.length}` : "à vista"} · venc. {formatDate(inst.dueDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{formatCents(inst.amount)}</span>
                      <Badge tone={inst.status === "PAGO" ? "success" : "warning"}>{inst.status}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="card p-5">
            <p className="eyebrow mb-3 flex items-center gap-2"><User size={13} /> Cliente</p>
            <p className="font-semibold">{order.customer.name}</p>
            <div className="mt-3 space-y-2">
              <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-sm text-ink-soft hover:text-orange">
                <Mail size={14} /> {order.customer.email}
              </a>
              {phone && (
                <a
                  href={`https://wa.me/55${phone}?text=${waMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-ink-soft hover:text-positive"
                >
                  <MessageCircle size={14} /> WhatsApp ({order.customer.phone})
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
