import { MapPin, Truck } from "lucide-react";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import type { OrderView } from "@/lib/order-queries";

export function OrderSummary({ order }: { order: OrderView }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Items */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <p className="eyebrow">Itens · {order.items.length}</p>
        </div>
        <ul className="divide-y divide-line">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="data-label text-faint">{it.brand}</p>
                <p className="truncate font-medium">{it.productName}</p>
                <p className="text-xs text-muted">
                  {PRODUCT_TYPE_LABELS[it.type as ProductType] ?? it.type} ·{" "}
                  {SIZE_LABELS[it.size as Size] ?? it.size} · {it.color} · {it.qty}x
                </p>
              </div>
              <span className="shrink-0 font-medium">{formatCents(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatCents(order.subtotal)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-positive">
              <span>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</span>
              <span>- {formatCents(order.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Frete</span>
            <span>{order.shippingTotal === 0 ? "Grátis" : formatCents(order.shippingTotal)}</span>
          </div>
          <div className="flex items-end justify-between border-t border-line pt-3">
            <span className="font-semibold uppercase">Total</span>
            <span className="font-display text-2xl text-orange">{formatCents(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery */}
      <div className="space-y-4">
        {order.address && (
          <div className="card p-5">
            <p className="eyebrow mb-3 flex items-center gap-2"><MapPin size={13} /> Entrega</p>
            <p className="text-sm font-semibold">{order.address.recipient}</p>
            <p className="text-sm text-muted">
              {order.address.street}, {order.address.number}
              {order.address.complement ? ` · ${order.address.complement}` : ""}
            </p>
            <p className="text-sm text-muted">
              {order.address.district} — {order.address.city}/{order.address.state}
            </p>
            <p className="text-sm text-muted">CEP {order.address.cep}</p>
          </div>
        )}
        {(order.shippingLabel || order.trackingCode) && (
          <div className="card p-5">
            <p className="eyebrow mb-3 flex items-center gap-2"><Truck size={13} /> Envio</p>
            {order.shippingLabel && <p className="text-sm text-ink-soft">{order.shippingLabel}</p>}
            {order.trackingCode && (
              <p className="mt-2 text-sm">
                <span className="text-muted">Rastreio: </span>
                <span className="font-mono text-orange">{order.trackingCode}</span>
              </p>
            )}
          </div>
        )}
        {order.note && (
          <div className="card p-5">
            <p className="eyebrow mb-2">Observação</p>
            <p className="text-sm text-muted">{order.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
