"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { payInstallment, payAllInstallments } from "@/lib/orders";
import { logAudit } from "@/lib/audit";

/** Register payment of a single crediário parcela. */
export async function payAprazoInstallmentAction(
  installmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("aprazo");
  try {
    await payInstallment(installmentId, staff.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao dar baixa." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "A prazo", entityId: installmentId, summary: "Recebeu uma parcela de venda a prazo" });
  revalidatePath("/backoffice/a-prazo");
  revalidatePath("/backoffice");
  return { ok: true };
}

/** Settle every pending parcela of a crediário sale at once. */
export async function settleAprazoAction(
  orderNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("aprazo");
  const order = await db.order.findUnique({ where: { number: orderNumber } });
  if (!order) return { ok: false, error: "Venda não encontrada." };
  try {
    await payAllInstallments(order.id, staff.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao dar baixa." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "A prazo", entityId: orderNumber, summary: `Quitou todas as parcelas da venda ${orderNumber}` });
  revalidatePath("/backoffice/a-prazo");
  revalidatePath("/backoffice");
  return { ok: true };
}
