import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ChevronLeft } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { getCustomerOrder } from "@/lib/order-queries";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderSummary } from "@/components/orders/order-summary";
import { PixBox } from "@/components/checkout/pix-box";
import { BoletoBox } from "@/components/checkout/boleto-box";

export const metadata: Metadata = { title: "Detalhe do pedido" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const customer = await requireCustomer();
  const order = await getCustomerOrder(number, customer.id);
  if (!order) notFound();

  const pending = order.status === "AGUARDANDO_PAGAMENTO";
  const qrSvg =
    pending && order.pixPayload
      ? await QRCode.toString(order.pixPayload, {
          type: "svg",
          margin: 0,
          color: { dark: "#101216", light: "#ffffff" },
        })
      : "";

  return (
    <div className="space-y-6">
      <Link href="/conta/pedidos" className="inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar aos pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Pedido</p>
          <h1 className="font-display text-3xl md:text-4xl">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">Realizado em {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {pending && order.paymentMethod === "BOLETO" && order.installments.length > 0 && (
        <BoletoBox installments={order.installments} />
      )}
      {pending && order.paymentMethod === "PIX_MANUAL" && order.pixPayload && (
        <PixBox payload={order.pixPayload} qrSvg={qrSvg} amount={order.total} />
      )}

      <OrderTimeline status={order.status} events={order.events} />
      <OrderSummary order={order} />
    </div>
  );
}
