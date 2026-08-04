"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { transitionOrder } from "@/lib/orders";
import { isOrderStatus, type OrderStatus } from "@/lib/enums";

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
