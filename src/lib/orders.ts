import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { computePrice, getActivePromotions } from "./pricing";
import { computeShipping } from "./shipping";
import { validateCoupon } from "./coupon";
import { buildPixPayload } from "./pix";
import { buildInstallments } from "./boleto";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus } from "./enums";

const CART_COOKIE = "hux_cart";

function orderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HUX${yy}-${rand}`;
}

export type CreateOrderInput = {
  addressId: string;
  couponCode?: string | null;
  note?: string | null;
  paymentMethod?: "PIX_MANUAL" | "BOLETO";
  boletoParcelas?: number; // 1-3, only for BOLETO
};

export type CreateOrderResult =
  | { ok: true; number: string }
  | { ok: false; error: string };

export async function createOrder(
  customerId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  // --- resolve cart (from cookie, fallback to customer's latest) ---
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart =
    (token ? await db.cart.findUnique({ where: { token } }) : null) ??
    (await db.cart.findFirst({ where: { customerId }, orderBy: { updatedAt: "desc" } }));
  if (!cart) return { ok: false, error: "Carrinho não encontrado." };

  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: { product: true } } },
  });
  if (items.length === 0) return { ok: false, error: "Seu carrinho está vazio." };

  // --- address ---
  const address = await db.address.findFirst({
    where: { id: input.addressId, customerId },
  });
  if (!address) return { ok: false, error: "Endereço inválido." };

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: "Cliente inválido." };

  // --- recompute prices server-side (never trust the client) ---
  const promotions = await getActivePromotions();
  type Line = {
    variantId: string;
    brand: string; productName: string; type: string; size: string; color: string; sku: string;
    unitPrice: number; unitCost: number; qty: number; lineTotal: number; stock: number;
  };
  const lines: Line[] = [];
  for (const it of items) {
    const v = it.variant;
    if (!v || !v.active || !v.product.active) {
      return { ok: false, error: `Produto indisponível: ${it.variant?.product.name ?? ""}.` };
    }
    const { price } = computePrice(v.product, promotions);
    const unit = v.priceOverride ?? price;
    lines.push({
      variantId: v.id,
      brand: v.product.brand,
      productName: v.product.name,
      type: v.product.type,
      size: v.size,
      color: v.color,
      sku: v.sku,
      unitPrice: unit,
      unitCost: v.cost,
      qty: it.qty,
      lineTotal: unit * it.qty,
      stock: v.stock,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const costTotal = lines.reduce((s, l) => s + l.unitCost * l.qty, 0);

  // --- shipping ---
  const quote = await computeShipping(address.state, subtotal);
  if (!quote) return { ok: false, error: "Não há frete disponível para este endereço." };

  // --- coupon ---
  let discountTotal = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let freeShipping = false;
  if (input.couponCode) {
    const res = await validateCoupon(input.couponCode, subtotal, customerId);
    if (!res.ok) return { ok: false, error: res.error ?? "Cupom inválido." };
    discountTotal = res.discountCents ?? 0;
    couponId = res.couponId ?? null;
    couponCode = res.code ?? null;
    freeShipping = !!res.freeShipping;
  }

  const shippingTotal = freeShipping ? 0 : quote.price;
  const total = Math.max(0, subtotal - discountTotal) + shippingTotal;

  const number = orderNumber();
  const method = input.paymentMethod === "BOLETO" ? "BOLETO" : "PIX_MANUAL";

  const pixPayload =
    method === "PIX_MANUAL"
      ? buildPixPayload({
          key: process.env.PIX_KEY || "contato@hux.com.br",
          merchantName: process.env.PIX_MERCHANT_NAME || "HUX RUN",
          merchantCity: process.env.PIX_MERCHANT_CITY || "SAO PAULO",
          amountCents: total,
          txid: number.replace("-", ""),
        })
      : null;

  const installmentPlan =
    method === "BOLETO" ? buildInstallments(total, input.boletoParcelas ?? 1) : [];

  const addressSnapshot = JSON.stringify({
    recipient: address.recipient,
    cep: address.cep,
    street: address.street,
    number: address.number,
    complement: address.complement,
    district: address.district,
    city: address.city,
    state: address.state,
  });
  const customerSnapshot = JSON.stringify({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  });

  // --- transaction: stock guard + persist ---
  try {
    await db.$transaction(async (tx) => {
      // Re-check + decrement stock atomically.
      for (const l of lines) {
        const fresh = await tx.productVariant.findUnique({ where: { id: l.variantId } });
        if (!fresh || fresh.stock < l.qty) {
          throw new Error(
            `Estoque insuficiente para ${l.productName} (${l.size}/${l.color}).`,
          );
        }
      }

      const order = await tx.order.create({
        data: {
          number,
          customerId,
          status: "AGUARDANDO_PAGAMENTO",
          paymentMethod: method,
          paymentStatus: "PENDENTE",
          subtotal,
          discountTotal,
          shippingTotal,
          total,
          costTotal,
          couponId,
          couponCode,
          shippingLabel: quote.label,
          shippingEtaDays: quote.etaDays,
          addressSnapshot,
          customerSnapshot,
          pixPayload,
          notes: input.note ?? null,
          items: {
            create: lines.map((l) => ({
              variantId: l.variantId,
              brand: l.brand,
              productName: l.productName,
              type: l.type,
              size: l.size,
              color: l.color,
              sku: l.sku,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              qty: l.qty,
              lineTotal: l.lineTotal,
            })),
          },
          events: {
            create: {
              status: "AGUARDANDO_PAGAMENTO",
              note: `Pedido criado. Aguardando pagamento via ${PAYMENT_METHOD_LABELS[method]}.`,
            },
          },
          installments: installmentPlan.length
            ? {
                create: installmentPlan.map((p) => ({
                  seq: p.seq,
                  amount: p.amount,
                  dueDate: p.dueDate,
                  linha: p.linha,
                  status: "PENDENTE",
                })),
              }
            : undefined,
        },
      });

      for (const l of lines) {
        await tx.productVariant.update({
          where: { id: l.variantId },
          data: { stock: { decrement: l.qty } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: l.variantId,
            type: "SAIDA",
            qty: l.qty,
            reason: `Venda — pedido ${number}`,
            orderId: order.id,
          },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.notification.create({
        data: {
          customerId,
          type: "PEDIDO",
          title: `Pedido ${number} recebido`,
          body:
            method === "BOLETO"
              ? "Gere/pague o(s) boleto(s) para confirmarmos seu pedido."
              : "Estamos aguardando a confirmação do seu pagamento via Pix.",
          link: `/conta/pedidos/${number}`,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar o pedido." };
  }

  return { ok: true, number };
}

/** Add an event + optional customer notification and move an order's status. */
export async function transitionOrder(
  orderId: string,
  status: OrderStatus,
  opts: { note?: string; trackingCode?: string; notify?: boolean; staffId?: string } = {},
) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido não encontrado.");

  const data: Record<string, unknown> = { status };
  if (status === "PAGO") {
    data.paymentStatus = "CONFIRMADO";
    data.paidAt = new Date();
  }
  if (status === "CANCELADO") data.paymentStatus = order.paymentStatus === "CONFIRMADO" ? "ESTORNADO" : "PENDENTE";
  if (opts.trackingCode !== undefined) data.trackingCode = opts.trackingCode;
  if (opts.staffId) data.handledById = opts.staffId;

  await db.$transaction(async (tx) => {
    // Restock on cancellation.
    if (status === "CANCELADO" && order.status !== "CANCELADO") {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const it of items) {
        if (!it.variantId) continue;
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stock: { increment: it.qty } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: it.variantId,
            type: "ENTRADA",
            qty: it.qty,
            reason: `Cancelamento — pedido ${order.number}`,
            orderId: order.id,
            userId: opts.staffId ?? null,
          },
        });
      }
    }

    await tx.order.update({ where: { id: orderId }, data });
    await tx.orderEvent.create({
      data: { orderId, status, note: opts.note ?? ORDER_STATUS_LABELS[status] },
    });

    if (opts.notify !== false && order.customerId) {
      const messages: Record<OrderStatus, string> = {
        AGUARDANDO_PAGAMENTO: "Seu pedido está aguardando pagamento.",
        PAGO: "Pagamento confirmado! Já estamos preparando seu pedido. 🧡",
        EM_SEPARACAO: "Seu pedido está sendo separado no nosso estoque.",
        ENVIADO: opts.trackingCode
          ? `Seu pedido foi enviado! Rastreio: ${opts.trackingCode}`
          : "Seu pedido foi enviado!",
        ENTREGUE: "Seu pedido foi entregue. Bons quilômetros! 🏃",
        CANCELADO: "Seu pedido foi cancelado.",
      };
      await tx.notification.create({
        data: {
          customerId: order.customerId,
          type: "PEDIDO",
          title: `Pedido ${order.number} — ${ORDER_STATUS_LABELS[status]}`,
          body: messages[status],
          link: `/conta/pedidos/${order.number}`,
        },
      });
    }
  });
}

// --------------------------- boleto settlement -----------------------------

/** When every active boleto of an order is paid, move the order to PAGO. */
async function syncOrderFromInstallments(orderId: string, staffId?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { installments: true },
  });
  if (!order) return;
  const active = order.installments.filter((i) => i.status !== "CANCELADO");
  const allPaid = active.length > 0 && active.every((i) => i.status === "PAGO");
  if (!allPaid || order.paymentStatus === "CONFIRMADO") return;

  if (order.status === "AGUARDANDO_PAGAMENTO") {
    await transitionOrder(orderId, "PAGO", { note: "Boleto(s) quitado(s).", staffId });
  } else {
    await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: "CONFIRMADO", paidAt: new Date() },
    });
  }
}

/** Give discharge to a single boleto (parcela). */
export async function payInstallment(installmentId: string, staffId?: string) {
  const inst = await db.installment.findUnique({ where: { id: installmentId } });
  if (!inst) throw new Error("Boleto não encontrado.");
  if (inst.status !== "PAGO") {
    await db.installment.update({
      where: { id: installmentId },
      data: { status: "PAGO", paidAt: new Date() },
    });
  }
  await syncOrderFromInstallments(inst.orderId, staffId);
}

/** Give discharge to all pending boletos of an order at once. */
export async function payAllInstallments(orderId: string, staffId?: string) {
  await db.installment.updateMany({
    where: { orderId, status: "PENDENTE" },
    data: { status: "PAGO", paidAt: new Date() },
  });
  await syncOrderFromInstallments(orderId, staffId);
}
