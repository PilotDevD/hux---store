import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { getCustomer } from "@/lib/auth";
import { getCustomerOrder } from "@/lib/order-queries";
import { OrderSummary } from "@/components/orders/order-summary";
import { PixBox } from "@/components/checkout/pix-box";
import { BoletoBox } from "@/components/checkout/boleto-box";

export const metadata: Metadata = { title: "Pedido confirmado", robots: { index: false } };

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const customer = await getCustomer();
  if (!customer) redirect(`/conta/login?next=/checkout/sucesso/${number}`);

  const order = await getCustomerOrder(number, customer.id);
  if (!order) notFound();

  const qrSvg = order.pixPayload
    ? await QRCode.toString(order.pixPayload, {
        type: "svg",
        margin: 0,
        color: { dark: "#101216", light: "#ffffff" },
      })
    : "";

  const pending = order.status === "AGUARDANDO_PAGAMENTO";

  return (
    <div className="container-hux max-w-4xl py-12 md:py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full border border-positive/40 bg-positive/10">
          <CheckCircle2 size={30} className="text-positive" />
        </div>
        <p className="eyebrow mb-2">Pedido {order.number}</p>
        <h1 className="headline text-4xl md:text-5xl">Pedido recebido!</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          {!pending
            ? "Seu pedido está confirmado. Acompanhe o status pela sua conta."
            : order.paymentMethod === "BOLETO"
              ? "Falta só o pagamento. Pague o(s) boleto(s) abaixo para concluir."
              : "Falta só o pagamento. Escaneie o QR Code ou copie o código Pix abaixo para concluir."}
        </p>
      </div>

      {pending && order.paymentMethod === "BOLETO" && order.installments.length > 0 && (
        <div className="mb-8">
          <BoletoBox installments={order.installments} />
          <p className="mt-3 text-center text-xs text-faint">
            Assim que o pagamento for compensado, você recebe uma notificação e o pedido entra em separação.
          </p>
        </div>
      )}

      {pending && order.paymentMethod === "PIX_MANUAL" && order.pixPayload && (
        <div className="mb-8">
          <PixBox payload={order.pixPayload} qrSvg={qrSvg} amount={order.total} />
          <p className="mt-3 text-center text-xs text-faint">
            Assim que identificarmos o pagamento, você recebe uma notificação e o pedido entra em separação.
          </p>
        </div>
      )}

      <OrderSummary order={order} />

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={`/conta/pedidos/${order.number}`} className="btn btn-primary">
          <Package size={16} /> Acompanhar pedido
        </Link>
        <Link href="/loja" className="btn btn-ghost">
          Continuar comprando <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
