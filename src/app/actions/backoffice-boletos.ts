"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { payInstallment, payAllInstallments } from "@/lib/orders";
import { logAudit } from "@/lib/audit";

/** Give discharge to a single boleto (parcela). */
export async function payInstallmentAction(
  installmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("boletos");
  try {
    await payInstallment(installmentId, staff.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao dar baixa." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "Boleto", entityId: installmentId, summary: "Deu baixa em um boleto" });
  revalidatePath("/backoffice/boletos");
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice");
  return { ok: true };
}

/** Settle every pending boleto of an order at once (used by the order screen). */
export async function settleOrderBoletosAction(
  orderNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("pedidos");
  const order = await db.order.findUnique({ where: { number: orderNumber } });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  try {
    await payAllInstallments(order.id, staff.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao dar baixa." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "Boleto", entityId: orderNumber, summary: `Baixou todos os boletos do pedido ${orderNumber}` });
  revalidatePath(`/backoffice/pedidos/${orderNumber}`);
  revalidatePath("/backoffice/boletos");
  revalidatePath("/backoffice");
  return { ok: true };
}
