"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { transitionOrder } from "@/lib/orders";
import { validateCoupon } from "@/lib/coupon";
import { logAudit } from "@/lib/audit";
import { formatCents } from "@/lib/money";
import { isOrderStatus, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/enums";

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

export async function markRemarketedAction(number: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("pedidos");
  const order = await db.order.findUnique({ where: { number } });
  if (!order) return { ok: false };
  await db.order.update({ where: { id: order.id }, data: { remarketed: true } });
  await logAudit({ staff, action: "UPDATE", entity: "Pedido", entityId: number, summary: `Marcou remarketing tratado — ${number}` });
  revalidatePath("/backoffice");
  return { ok: true };
}
