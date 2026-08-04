import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardModule } from "@/lib/bo-guard";
import { getOrderForStaff } from "@/lib/order-queries";
import { formatCents } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  PRODUCT_TYPE_LABELS, SIZE_LABELS, PAYMENT_METHOD_LABELS,
  type ProductType, type Size,
} from "@/lib/enums";
import { PrintButton } from "@/components/backoffice/print-button";

export const metadata: Metadata = { title: "Recibo", robots: { index: false } };

// Standalone printable receipt (outside the backoffice shell). Light document
// so it prints cleanly. Staff-only via middleware + guardModule.
export default async function ReciboPage({ params }: { params: Promise<{ number: string }> }) {
  await guardModule("pedidos");
  const { number } = await params;
  const order = await getOrderForStaff(number);
  if (!order) notFound();

  const addr = order.address;
  const paid = order.paymentStatus === "CONFIRMADO";

  return (
    <div className="min-h-screen bg-neutral-100 py-8 text-neutral-900 print:bg-white print:py-0">
      <div className="mx-auto max-w-[820px] px-4">
        {/* toolbar (screen only) */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <a href={`/backoffice/pedidos/${order.number}`} className="text-sm text-neutral-500 hover:text-black">
            ← Voltar ao pedido
          </a>
          <PrintButton />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* header band */}
          <div className="flex items-center justify-between bg-black px-8 py-6 text-white">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hux-logo.png" alt="HUX" className="h-8 w-auto" />
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                Performance · Street · Run
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-neutral-400">Recibo de compra</p>
              <p className="font-mono text-lg font-bold">{order.number}</p>
              <p className="text-xs text-neutral-400">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          <div className="px-8 py-6">
            {/* parties */}
            <div className="grid gap-6 border-b border-neutral-200 pb-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Loja</p>
                <p className="font-semibold">{process.env.PIX_MERCHANT_NAME || "HUX RUN LTDA"}</p>
                <p className="text-sm text-neutral-600">contato@hux.com.br</p>
                <p className="text-sm text-neutral-600">São Paulo · SP</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Cliente</p>
                <p className="font-semibold">{order.customer.name}</p>
                <p className="text-sm text-neutral-600">{order.customer.email}</p>
                {order.customer.phone && <p className="text-sm text-neutral-600">{order.customer.phone}</p>}
                {addr && (
                  <p className="mt-1 text-sm text-neutral-600">
                    {addr.street}, {addr.number}{addr.complement ? ` · ${addr.complement}` : ""} — {addr.district}, {addr.city}/{addr.state} · {addr.cep}
                  </p>
                )}
              </div>
            </div>

            {/* items */}
            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-[11px] uppercase tracking-widest text-neutral-400">
                  <th className="pb-2">Produto</th>
                  <th className="pb-2">Variação</th>
                  <th className="pb-2 text-center">Qtd</th>
                  <th className="pb-2 text-right">Unit.</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b border-neutral-100">
                    <td className="py-2.5">
                      <span className="font-medium">{it.productName}</span>
                      <span className="block text-xs text-neutral-500">{it.brand} · {PRODUCT_TYPE_LABELS[it.type as ProductType] ?? it.type}</span>
                    </td>
                    <td className="py-2.5 text-neutral-600">{SIZE_LABELS[it.size as Size] ?? it.size} · {it.color}</td>
                    <td className="py-2.5 text-center">{it.qty}</td>
                    <td className="py-2.5 text-right">{formatCents(it.unitPrice)}</td>
                    <td className="py-2.5 text-right font-medium">{formatCents(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{formatCents(order.subtotal)}</span></div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-neutral-600"><span>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</span><span>- {formatCents(order.discountTotal)}</span></div>
                )}
                <div className="flex justify-between text-neutral-600"><span>Frete</span><span>{order.shippingTotal === 0 ? "Grátis" : formatCents(order.shippingTotal)}</span></div>
                <div className="mt-1 flex justify-between border-t border-neutral-300 pt-2 text-base font-bold">
                  <span>Total</span><span>{formatCents(order.total)}</span>
                </div>
              </div>
            </div>

            {/* payment */}
            <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Pagamento</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {paid ? "Pago" : "Pendente"}
                </span>
              </div>
              <p className="mt-1 font-semibold">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
              {order.paidAt && <p className="text-sm text-neutral-500">Pago em {formatDateTime(order.paidAt)}</p>}

              {order.installments.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400">
                      <th className="pb-1">Parcela</th>
                      <th className="pb-1">Vencimento</th>
                      <th className="pb-1 text-right">Valor</th>
                      <th className="pb-1 text-right">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.installments.map((inst) => (
                      <tr key={inst.id} className="border-t border-neutral-200">
                        <td className="py-1.5">{order.installments.length > 1 ? `${inst.seq}/${order.installments.length}` : "à vista"}</td>
                        <td className="py-1.5">{formatDate(inst.dueDate)}</td>
                        <td className="py-1.5 text-right">{formatCents(inst.amount)}</td>
                        <td className="py-1.5 text-right">{inst.status === "PAGO" ? "Pago" : "Pendente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-neutral-400">
              Este recibo é um comprovante de compra e não constitui documento fiscal. · HUX RUN · Obrigado por correr com a gente. 🖤💚
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
