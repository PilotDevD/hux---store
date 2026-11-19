"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { computePrice, getActivePromotions } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";
import { formatCents } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, MANUAL_PAYMENT_METHODS } from "@/lib/enums";

const methodLabel = (m: string) => PAYMENT_METHOD_LABELS[m] ?? m;
// Reservas são quitadas à vista (dinheiro/pix/cartão). O crediário "a prazo"
// exige o fluxo de parcelas da Venda física, então não é oferecido aqui.
// (não exportado: arquivos "use server" só podem exportar funções async)
const RESERVA_PAYMENT_METHODS = MANUAL_PAYMENT_METHODS.filter((m) => m !== "A_PRAZO");

function reservaOrderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HUX${yy}-R${rand}`;
}

const createSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  customerName: z.string().min(2, "Informe o nome do cliente."),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function createReservationAction(
  input: z.input<typeof createSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("reservas");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const { variantId, qty, customerName, customerPhone, notes } = parsed.data;

  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.active) return { ok: false, error: "Variante indisponível." };
  if (variant.stock < qty) return { ok: false, error: "Estoque insuficiente para reservar." };

  const promos = await getActivePromotions();
  const { price } = computePrice(variant.product, promos);
  const unitPrice = variant.priceOverride ?? price;

  try {
    await db.$transaction([
      db.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: qty } } }),
      db.stockMovement.create({
        data: { variantId, type: "SAIDA", qty, reason: `Reserva — ${customerName}`, userId: staff.id },
      }),
      db.reservation.create({
        data: {
          variantId,
          brand: variant.product.brand,
          productName: variant.product.name,
          type: variant.product.type,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          unitPrice,
          qty,
          customerName,
          customerPhone: customerPhone || null,
          notes: notes || null,
          status: "ATIVA",
        },
      }),
    ]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar reserva." };
  }
  await logAudit({ staff, action: "CREATE", entity: "Reserva", summary: `Reservou ${qty}x ${variant.product.name} para ${customerName}` });
  revalidatePath("/backoffice/reservas");
  revalidatePath("/backoffice/estoque");
  return { ok: true };
}

/**
 * Registra o pagamento de uma reserva ANTES da retirada ("Pago, aguardando
 * retirada"). Não finaliza a reserva (o estoque segue reservado) — a venda só é
 * concluída na retirada via "Fechar venda". Lança no caixa se for em dinheiro.
 */
export async function markReservationPaidAction(
  reservationId: string,
  method: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("reservas");
  if (!(RESERVA_PAYMENT_METHODS as readonly string[]).includes(method)) return { ok: false, error: "Forma de pagamento inválida para reserva." };
  const r = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };
  if (r.paid) return { ok: false, error: "Reserva já está marcada como paga." };

  const total = r.unitPrice * r.qty;
  try {
    await db.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { paid: true, paidMethod: method, paidAt: new Date() },
      });
      if (method === "DINHEIRO" && total > 0) {
        await tx.cashEntry.create({ data: { kind: "ENTRADA", amount: total, note: `Reserva paga — ${r.customerName}`, userId: staff.id, userName: staff.displayName } });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao registrar pagamento." };
  }
  await logAudit({ staff, action: "PAYMENT", entity: "Reserva", entityId: reservationId, summary: `Registrou pagamento (${methodLabel(method)}) da reserva de ${r.customerName} — ${formatCents(total)}, aguardando retirada` });
  revalidatePath("/backoffice/reservas");
  revalidatePath("/backoffice");
  return { ok: true };
}

/**
 * "Fechar venda" — turns an active reservation into a paid order (stock already
 * held). A forma de pagamento pode ser escolhida aqui (ou, se a reserva já foi
 * paga antecipadamente, usa-se a forma registrada). Lança no caixa se dinheiro
 * e ainda não tiver sido lançado no pagamento antecipado.
 */
export async function closeReservationAction(
  reservationId: string,
  method?: string,
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const staff = await requireModule("reservas");
  const r = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };

  // Forma efetiva: se já pago, usa a forma do pagamento antecipado; senão a escolhida (default Pix).
  const effMethod = r.paid ? (r.paidMethod ?? "PIX_MANUAL") : (method ?? "PIX_MANUAL");
  if (!(RESERVA_PAYMENT_METHODS as readonly string[]).includes(effMethod)) return { ok: false, error: "Forma de pagamento inválida para reserva." };

  const variant = await db.productVariant.findUnique({ where: { id: r.variantId } });
  const unitCost = variant?.cost ?? 0;
  const subtotal = r.unitPrice * r.qty;
  const number = reservaOrderNumber();

  try {
    await db.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          number,
          customerId: null,
          status: "PAGO",
          paymentMethod: effMethod,
          paymentStatus: "CONFIRMADO",
          subtotal,
          discountTotal: 0,
          shippingTotal: 0,
          total: subtotal,
          costTotal: unitCost * r.qty,
          shippingLabel: "Retirada / balcão",
          addressSnapshot: "{}",
          customerSnapshot: JSON.stringify({ name: r.customerName, email: "", phone: r.customerPhone }),
          paidAt: new Date(),
          handledById: staff.id,
          notes: `Venda de reserva. ${r.notes ?? ""}`.trim(),
          items: {
            create: [{
              variantId: r.variantId,
              brand: r.brand, productName: r.productName, type: r.type,
              size: r.size, color: r.color, sku: r.sku,
              unitPrice: r.unitPrice, unitCost, qty: r.qty, lineTotal: subtotal,
            }],
          },
          events: {
            create: [
              { status: "AGUARDANDO_PAGAMENTO", note: "Venda originada de reserva." },
              { status: "PAGO", note: `Pagamento confirmado no fechamento da reserva (${methodLabel(effMethod)}).` },
            ],
          },
        },
      });
      // Caixa: lança dinheiro só se ainda não lançado (ou seja, não foi pago antecipadamente).
      if (effMethod === "DINHEIRO" && !r.paid && subtotal > 0) {
        await tx.cashEntry.create({ data: { kind: "ENTRADA", amount: subtotal, note: `Venda de reserva ${number} (dinheiro)`, userId: staff.id, userName: staff.displayName } });
      }
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "FINALIZADA", orderNumber: number, settledAt: new Date(), paid: true, paidMethod: r.paidMethod ?? effMethod },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao fechar venda." };
  }
  await logAudit({ staff, action: "STATUS", entity: "Reserva", entityId: reservationId, summary: `Fechou a venda da reserva (${methodLabel(effMethod)}) → pedido ${number}` });
  revalidatePath("/backoffice/reservas");
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice");
  return { ok: true, number };
}

export async function cancelReservationAction(
  reservationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("reservas");
  const r = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };

  await db.$transaction([
    db.productVariant.update({ where: { id: r.variantId }, data: { stock: { increment: r.qty } } }),
    db.stockMovement.create({
      data: { variantId: r.variantId, type: "ENTRADA", qty: r.qty, reason: `Reserva cancelada — ${r.customerName}`, userId: staff.id },
    }),
    db.reservation.update({ where: { id: reservationId }, data: { status: "CANCELADA", settledAt: new Date() } }),
  ]);
  await logAudit({ staff, action: "DELETE", entity: "Reserva", entityId: reservationId, summary: `Cancelou a reserva de ${r.customerName} (estoque devolvido)` });
  revalidatePath("/backoffice/reservas");
  revalidatePath("/backoffice/estoque");
  return { ok: true };
}
