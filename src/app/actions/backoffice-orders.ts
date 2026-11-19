"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { transitionOrder } from "@/lib/orders";
import { validateCoupon } from "@/lib/coupon";
import { logAudit } from "@/lib/audit";
import { formatCents, parseReaisToCents } from "@/lib/money";
import { isOrderStatus, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, SPLIT_PAYMENT_METHODS, type OrderStatus } from "@/lib/enums";

const payLabel = (m: string) => PAYMENT_METHOD_LABELS[m] ?? m;

async function findOrder(number: string) {
  return db.order.findUnique({ where: { number } });
}

export async function setOrderStatusAction(
  number: string,
  status: string,
  opts: { trackingCode?: string; note?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  if (!isOrderStatus(status)) return { ok: false, error: "Status inválido." };
  const order = await findOrder(number);
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  try {
    await transitionOrder(order.id, status as OrderStatus, {
      trackingCode: opts.trackingCode,
      note: opts.note,
      staffId: staff.id,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao atualizar." };
  }
  await logAudit({
    staff,
    action: status === "PAGO" ? "PAYMENT" : "STATUS",
    entity: "Pedido",
    entityId: number,
    summary: `Pedido ${number} → ${ORDER_STATUS_LABELS[status as OrderStatus] ?? status}`,
    meta: { status, trackingCode: opts.trackingCode ?? null },
  });
  revalidatePath(`/backoffice/pedidos/${number}`);
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice");
  return { ok: true };
}

export async function confirmPaymentAction(number: string) {
  return setOrderStatusAction(number, "PAGO", { note: "Pagamento Pix confirmado manualmente." });
}

export async function cancelOrderAction(number: string, reason: string) {
  return setOrderStatusAction(number, "CANCELADO", {
    note: reason || "Pedido cancelado pela loja.",
  });
}

export async function shipOrderAction(number: string, trackingCode: string) {
  return setOrderStatusAction(number, "ENVIADO", {
    trackingCode: trackingCode || undefined,
    note: trackingCode ? `Enviado. Rastreio: ${trackingCode}` : "Pedido enviado.",
  });
}

/**
 * Change (or remove) the discount coupon applied to an order and recompute the
 * discount/total from the coupon over the order subtotal. Works for online and
 * physical sales. Pass an empty code to remove the coupon.
 */
export async function changeOrderCouponAction(
  number: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  const order = await db.order.findUnique({ where: { number } });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status === "CANCELADO") return { ok: false, error: "Pedido cancelado." };

  const code = rawCode.trim().toUpperCase();
  let newCouponId: string | null = null;
  let newCouponCode: string | null = null;
  let newDiscount = 0;

  if (code) {
    const res = await validateCoupon(code, order.subtotal, order.customerId ?? null);
    if (!res.ok) return { ok: false, error: res.error ?? "Cupom inválido." };
    if (res.type === "FREE_SHIPPING") return { ok: false, error: "Troca para cupom de frete grátis não é suportada aqui." };
    newCouponId = res.couponId ?? null;
    newCouponCode = res.code ?? null;
    newDiscount = res.discountCents ?? 0;
  }

  if (order.couponId === newCouponId && order.couponCode === newCouponCode) {
    return { ok: false, error: "Este cupom já está aplicado." };
  }

  const discountTotal = Math.min(order.subtotal, newDiscount);
  const total = Math.max(0, order.subtotal - discountTotal) + order.shippingTotal;

  try {
    await db.$transaction(async (tx) => {
      if (order.couponId && order.couponId !== newCouponId) {
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } }).catch(() => {});
      }
      if (newCouponId && newCouponId !== order.couponId) {
        await tx.coupon.update({ where: { id: newCouponId }, data: { usedCount: { increment: 1 } } });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { couponId: newCouponId, couponCode: newCouponCode, discountTotal, total },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id, status: order.status,
          note: newCouponCode
            ? `Cupom alterado para ${newCouponCode} (desconto ${formatCents(discountTotal)}, total ${formatCents(total)}).`
            : `Cupom removido (total ${formatCents(total)}).`,
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao alterar o cupom." };
  }

  await logAudit({ staff, action: "UPDATE", entity: "Pedido", entityId: number, summary: `Alterou o cupom do pedido ${number} → ${newCouponCode ?? "sem cupom"} (total ${formatCents(total)})` });
  revalidatePath(`/backoffice/pedidos/${number}`);
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice");
  return { ok: true };
}

/** Admin-only: reassign the seller credited for a sale. */
export async function changeOrderSellerAction(
  number: string,
  sellerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  if (staff.role !== "ADMIN") return { ok: false, error: "Apenas o administrador pode alterar o vendedor." };
  const order = await db.order.findUnique({ where: { number } });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  const seller = await db.user.findUnique({ where: { id: sellerId } });
  if (!seller) return { ok: false, error: "Vendedor não encontrado." };

  await db.order.update({ where: { id: order.id }, data: { soldByUserId: seller.id, soldByName: seller.displayName } });
  await logAudit({ staff, action: "UPDATE", entity: "Pedido", entityId: number, summary: `Alterou o vendedor do pedido ${number} → ${seller.displayName}` });
  revalidatePath(`/backoffice/pedidos/${number}`);
  revalidatePath("/backoffice/vendas");
  revalidatePath("/backoffice");
  return { ok: true };
}

/**
 * Estorno PARCIAL por forma de pagamento (item 10). Registra um estorno de um
 * valor em uma forma específica (ex.: estornar só a parte do cartão de uma
 * venda dividida). A parte em dinheiro sai do caixa. Quando o total estornado
 * atinge o total do pedido, a venda passa a ESTORNADO.
 */
export async function refundOrderPaymentAction(
  number: string,
  method: string,
  amountReais: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  if (!(SPLIT_PAYMENT_METHODS as readonly string[]).includes(method)) return { ok: false, error: "Forma de pagamento inválida para estorno." };
  const order = await db.order.findUnique({ where: { number }, include: { payments: true } });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.paymentStatus !== "CONFIRMADO") return { ok: false, error: "Só é possível estornar vendas com pagamento confirmado." };
  const amount = parseReaisToCents(amountReais);
  if (amount <= 0) return { ok: false, error: "Informe um valor maior que zero." };

  // Saldo líquido disponível para estorno nessa forma.
  const hasRows = order.payments.length > 0;
  const netForMethod = order.payments.filter((p) => p.method === method).reduce((s, p) => s + (p.kind === "ESTORNO" ? -p.amount : p.amount), 0);
  const available = hasRows ? netForMethod : (order.paymentMethod === method ? order.total : 0);
  if (available <= 0) return { ok: false, error: `Não há valor a estornar em ${payLabel(method)} neste pedido.` };
  if (amount > available) return { ok: false, error: `Máximo estornável em ${payLabel(method)}: ${formatCents(available)}.` };

  try {
    await db.$transaction(async (tx) => {
      // Normaliza pedidos antigos (sem linhas de pagamento): cria a linha base.
      if (!hasRows) {
        await tx.orderPayment.create({ data: { orderId: order.id, kind: "PAGAMENTO", method: order.paymentMethod, amount: order.total, userId: staff.id, userName: staff.displayName } });
      }
      await tx.orderPayment.create({ data: { orderId: order.id, kind: "ESTORNO", method, amount, note: "Estorno parcial", userId: staff.id, userName: staff.displayName } });
      if (method === "DINHEIRO") {
        await tx.cashEntry.create({ data: { kind: "SAIDA", amount, note: `Estorno ${number} (dinheiro)`, userId: staff.id, userName: staff.displayName } });
      }
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Estorno de ${formatCents(amount)} em ${payLabel(method)}.` } });

      // Se o total estornado alcançou o total do pedido, marca como ESTORNADO.
      const rows = await tx.orderPayment.findMany({ where: { orderId: order.id } });
      const estornado = rows.filter((p) => p.kind === "ESTORNO").reduce((s, p) => s + p.amount, 0);
      if (estornado >= order.total) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "ESTORNADO" } });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao estornar." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "Pedido", entityId: number, summary: `Estornou ${formatCents(amount)} em ${payLabel(method)} do pedido ${number}`, meta: { method, amount } });
  revalidatePath(`/backoffice/pedidos/${number}`);
  revalidatePath("/backoffice/vendas");
  revalidatePath("/backoffice");
  return { ok: true };
}

/**
 * Alterar a forma de pagamento de uma venda de forma única (item 2). Ajusta o
 * caixa quando troca de/para dinheiro. Não se aplica a venda a prazo nem a
 * venda com pagamento dividido (use os estornos nesses casos).
 */
export async function changeOrderPaymentMethodAction(
  number: string,
  method: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  if (!(SPLIT_PAYMENT_METHODS as readonly string[]).includes(method)) return { ok: false, error: "Forma de pagamento inválida." };
  const order = await db.order.findUnique({ where: { number }, include: { payments: true, installments: true } });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status === "CANCELADO") return { ok: false, error: "Pedido cancelado." };
  if (order.paymentMethod === "A_PRAZO" || order.installments.length > 0) return { ok: false, error: "Venda a prazo não permite trocar a forma aqui." };
  const payMethods = new Set(order.payments.filter((p) => p.kind === "PAGAMENTO").map((p) => p.method));
  if (order.paymentMethod === "MULTIPLO" || payMethods.size > 1) return { ok: false, error: "Venda com pagamento dividido: ajuste pelos estornos por forma." };
  if (order.paymentMethod === method) return { ok: false, error: "A venda já está nessa forma de pagamento." };

  const old = order.paymentMethod;
  const confirmed = order.paymentStatus === "CONFIRMADO";
  try {
    await db.$transaction(async (tx) => {
      // Ajuste de caixa: remove entrada antiga se era dinheiro; adiciona se passou a dinheiro.
      if (confirmed && order.total > 0) {
        if (old === "DINHEIRO") await tx.cashEntry.create({ data: { kind: "SAIDA", amount: order.total, note: `Troca de forma — ${number} (saiu dinheiro)`, userId: staff.id, userName: staff.displayName } });
        if (method === "DINHEIRO") await tx.cashEntry.create({ data: { kind: "ENTRADA", amount: order.total, note: `Troca de forma — ${number} (entrou dinheiro)`, userId: staff.id, userName: staff.displayName } });
      }
      // Reescreve a linha de pagamento única.
      await tx.orderPayment.deleteMany({ where: { orderId: order.id } });
      await tx.orderPayment.create({ data: { orderId: order.id, kind: "PAGAMENTO", method, amount: order.total, installments: null, userId: staff.id, userName: staff.displayName } });
      await tx.order.update({ where: { id: order.id }, data: { paymentMethod: method, cardInstallments: null } });
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Forma de pagamento alterada de ${payLabel(old)} para ${payLabel(method)}.` } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao alterar a forma." };
  }
  await logAudit({ staff, action: "UPDATE", entity: "Pedido", entityId: number, summary: `Alterou a forma de pagamento do pedido ${number}: ${payLabel(old)} → ${payLabel(method)}`, meta: { antes: old, depois: method } });
  revalidatePath(`/backoffice/pedidos/${number}`);
  revalidatePath("/backoffice/vendas");
  revalidatePath("/backoffice");
  return { ok: true };
}

export async function markRemarketedAction(number: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("pedidos");
  const order = await db.order.findUnique({ where: { number } });
  if (!order) return { ok: false };
  await db.order.update({ where: { id: order.id }, data: { remarketed: true } });
  await logAudit({ staff, action: "UPDATE", entity: "Pedido", entityId: number, summary: `Marcou remarketing tratado — ${number}` });
  revalidatePath("/backoffice");
  return { ok: true };
}
