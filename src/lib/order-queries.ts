import "server-only";
import { db } from "./db";
import { parseJson } from "./utils";

export type AddressSnapshot = {
  recipient: string; cep: string; street: string; number: string;
  complement: string | null; district: string; city: string; state: string;
};

export type OrderView = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: Date;
  paidAt: Date | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  couponCode: string | null;
  shippingLabel: string | null;
  shippingEtaDays: number | null;
  trackingCode: string | null;
  pixPayload: string | null;
  note: string | null;
  address: AddressSnapshot | null;
  customer: { name: string; email: string; phone: string | null };
  items: {
    id: string; brand: string; productName: string; type: string; size: string;
    color: string; sku: string; unitPrice: number; qty: number; lineTotal: number;
  }[];
  events: { status: string; note: string | null; createdAt: Date }[];
  installments: {
    id: string; seq: number; amount: number; dueDate: Date; status: string;
    linha: string | null; paidAt: Date | null;
  }[];
};

function toView(o: NonNullable<Awaited<ReturnType<typeof loadOrder>>>): OrderView {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    shippingTotal: o.shippingTotal,
    total: o.total,
    couponCode: o.couponCode,
    shippingLabel: o.shippingLabel,
    shippingEtaDays: o.shippingEtaDays,
    trackingCode: o.trackingCode,
    pixPayload: o.pixPayload,
    note: o.notes,
    address: parseJson<AddressSnapshot | null>(o.addressSnapshot, null),
    customer: parseJson<{ name: string; email: string; phone: string | null }>(o.customerSnapshot, {
      name: "", email: "", phone: null,
    }),
    items: o.items.map((it) => ({
      id: it.id, brand: it.brand, productName: it.productName, type: it.type,
      size: it.size, color: it.color, sku: it.sku, unitPrice: it.unitPrice,
      qty: it.qty, lineTotal: it.lineTotal,
    })),
    events: o.events.map((e) => ({ status: e.status, note: e.note, createdAt: e.createdAt })),
    installments: o.installments.map((i) => ({
      id: i.id, seq: i.seq, amount: i.amount, dueDate: i.dueDate,
      status: i.status, linha: i.linha, paidAt: i.paidAt,
    })),
  };
}

function loadOrder(where: { number: string } | { id: string }) {
  return db.order.findUnique({
    where: where as never,
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      installments: { orderBy: { seq: "asc" } },
    },
  });
}

export async function getCustomerOrder(number: string, customerId: string): Promise<OrderView | null> {
  const order = await loadOrder({ number });
  if (!order || order.customerId !== customerId) return null;
  return toView(order);
}

/** Staff-facing order view (no customer ownership check). */
export async function getOrderForStaff(number: string): Promise<OrderView | null> {
  const order = await loadOrder({ number });
  return order ? toView(order) : null;
}

export async function listCustomerOrders(customerId: string) {
  const orders = await db.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });
  return orders.map((o) => ({
    number: o.number,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o.items.length,
  }));
}
