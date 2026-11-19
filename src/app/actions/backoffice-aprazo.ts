"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { payInstallment, payAllInstallments } from "@/lib/orders";
import { logAudit } from "@/lib/audit";
import { parseReaisToCents, formatCents } from "@/lib/money";
import { parseDateInput, formatDate } from "@/lib/utils";

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

/** Alterar manualmente a data de vencimento de uma parcela (com registro na auditoria). */
export async function updateInstallmentDueDateAction(
  installmentId: string,
  dueDate: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("aprazo");
  const inst = await db.installment.findUnique({ where: { id: installmentId }, include: { order: { select: { number: true } } } });
  if (!inst) return { ok: false, error: "Parcela não encontrada." };
  const newDate = parseDateInput(dueDate);
  if (!newDate) return { ok: false, error: "Data inválida." };
  const oldDate = inst.dueDate;
  await db.installment.update({ where: { id: installmentId }, data: { dueDate: newDate } });
  await logAudit({
    staff, action: "UPDATE", entity: "A prazo", entityId: installmentId,
    summary: `Alterou vencimento da parcela ${inst.seq} (venda ${inst.order.number}) de ${formatDate(oldDate)} para ${formatDate(newDate)}`,
    meta: { antes: oldDate.toISOString(), depois: newDate.toISOString() },
  });
  revalidatePath("/backoffice/a-prazo");
  revalidatePath("/backoffice/boletos");
  return { ok: true };
}

/**
 * Conta corrente: registra um pagamento parcial (valor livre) da dívida a prazo,
 * aplicado às parcelas pendentes em ordem (FIFO). Mantém histórico (auditoria)
 * com dívida antes, valor recebido, forma de pagamento e saldo restante.
 */
export async function registerAprazoPaymentAction(
  orderNumber: string,
  amountReais: string,
  method = "DINHEIRO",
): Promise<{ ok: boolean; error?: string; applied?: number; remaining?: number }> {
  const staff = await requireModule("aprazo");
  const amount = parseReaisToCents(amountReais);
  if (amount <= 0) return { ok: false, error: "Informe um valor maior que zero." };

  const order = await db.order.findUnique({
    where: { number: orderNumber },
    include: { installments: { where: { status: "PENDENTE" }, orderBy: [{ dueDate: "asc" }, { seq: "asc" }] } },
  });
  if (!order) return { ok: false, error: "Venda não encontrada." };
  const totalPending = order.installments.reduce((s, i) => s + i.amount, 0);
  if (totalPending <= 0) return { ok: false, error: "Esta venda já está quitada." };

  const toApply = Math.min(amount, totalPending);
  let left = toApply;

  try {
    await db.$transaction(async (tx) => {
      for (const inst of order.installments) {
        if (left <= 0) break;
        if (left >= inst.amount) {
          await tx.installment.update({ where: { id: inst.id }, data: { status: "PAGO", paidAt: new Date() } });
          left -= inst.amount;
        } else {
          // pagamento parcial desta parcela: separa a parte paga e mantém o restante pendente
          await tx.installment.create({ data: { orderId: order.id, seq: inst.seq, amount: left, dueDate: inst.dueDate, status: "PAGO", paidAt: new Date() } });
          await tx.installment.update({ where: { id: inst.id }, data: { amount: inst.amount - left } });
          left = 0;
        }
      }
      // Se quitou tudo, confirma o pagamento do pedido.
      const stillPending = await tx.installment.count({ where: { orderId: order.id, status: "PENDENTE" } });
      if (stillPending === 0) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "CONFIRMADO", paidAt: new Date(), status: order.status === "AGUARDANDO_PAGAMENTO" ? "PAGO" : order.status } });
      }
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Recebido ${formatCents(toApply)} (${method.toLowerCase()}). Saldo: ${formatCents(totalPending - toApply)}.` } });
      if (method === "DINHEIRO") {
        await tx.cashEntry.create({ data: { kind: "ENTRADA", amount: toApply, note: `Recebimento a prazo ${orderNumber}`, userId: staff.id, userName: staff.displayName } });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao registrar pagamento." };
  }

  await logAudit({
    staff, action: "PAYMENT", entity: "A prazo", entityId: orderNumber,
    summary: `Recebeu ${formatCents(toApply)} (${method.toLowerCase()}) da venda ${orderNumber} — dívida antes ${formatCents(totalPending)}, saldo ${formatCents(totalPending - toApply)}`,
    meta: { antes: totalPending, recebido: toApply, saldo: totalPending - toApply, forma: method },
  });
  revalidatePath("/backoffice/a-prazo");
  revalidatePath("/backoffice");
  return { ok: true, applied: toApply, remaining: totalPending - toApply };
}
