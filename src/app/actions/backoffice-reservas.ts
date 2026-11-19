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

type ResItem = { variantId: string; brand: string; productName: string; type: string; size: string; color: string; sku: string; unitPrice: number; qty: number };
/** Itens da reserva: usa `items` quando existem, senão os campos planos (reservas antigas / 1 produto). */
function reservationItems(r: {
  items?: ResItem[]; variantId: string; brand: string; productName: string; type: string;
  size: string; color: string; sku: string; unitPrice: number; qty: number;
}): ResItem[] {
  if (r.items && r.items.length > 0) return r.items;
  return [{ variantId: r.variantId, brand: r.brand, productName: r.productName, type: r.type, size: r.size, color: r.color, sku: r.sku, unitPrice: r.unitPrice, qty: r.qty }];
}

function reservaOrderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HUX${yy}-R${rand}`;
}

const createSchema = z.object({
  // Compatibilidade: aceita um único produto (variantId+qty) OU uma lista (items).
  variantId: z.string().optional(),
  qty: z.coerce.number().int().positive().optional(),
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.coerce.number().int().positive() })).optional(),
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

  // Normaliza para uma lista de itens (dedupe por variante).
  const reqItems = (parsed.data.items && parsed.data.items.length > 0)
    ? parsed.data.items
    : (variantId ? [{ variantId, qty: qty ?? 1 }] : []);
  if (reqItems.length === 0) return { ok: false, error: "Selecione ao menos um produto." };
  const byVariant = new Map<string, number>();
  for (const it of reqItems) byVariant.set(it.variantId, (byVariant.get(it.variantId) ?? 0) + it.qty);

  const promos = await getActivePromotions();
  const built: { variantId: string; brand: string; productName: string; type: string; size: string; color: string; sku: string; unitPrice: number; qty: number }[] = [];
  for (const [vid, q] of byVariant) {
    const v = await db.productVariant.findUnique({ where: { id: vid }, include: { product: true } });
    if (!v || !v.active) return { ok: false, error: "Variante indisponível." };
    if (v.stock < q) return { ok: false, error: `Estoque insuficiente para ${v.product.name} (${v.size}/${v.color}).` };
    const { price } = computePrice(v.product, promos);
    built.push({ variantId: v.id, brand: v.product.brand, productName: v.product.name, type: v.product.type, size: v.size, color: v.color, sku: v.sku, unitPrice: v.priceOverride ?? price, qty: q });
  }
  const first = built[0];

  try {
    await db.$transaction(async (tx) => {
      for (const b of built) {
        await tx.productVariant.update({ where: { id: b.variantId }, data: { stock: { decrement: b.qty } } });
        await tx.stockMovement.create({ data: { variantId: b.variantId, type: "SAIDA", qty: b.qty, reason: `Reserva — ${customerName}`, userId: staff.id } });
      }
      await tx.reservation.create({
        data: {
          // Campos planos = 1º item (resumo/compatibilidade).
          variantId: first.variantId, brand: first.brand, productName: first.productName, type: first.type,
          size: first.size, color: first.color, sku: first.sku, unitPrice: first.unitPrice, qty: first.qty,
          customerName, customerPhone: customerPhone || null, notes: notes || null, status: "ATIVA",
          items: { create: built.map((b) => ({ variantId: b.variantId, brand: b.brand, productName: b.productName, type: b.type, size: b.size, color: b.color, sku: b.sku, unitPrice: b.unitPrice, qty: b.qty })) },
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar reserva." };
  }
  const totalQty = built.reduce((s, b) => s + b.qty, 0);
  await logAudit({ staff, action: "CREATE", entity: "Reserva", summary: `Reservou ${totalQty}x em ${built.length} produto(s) para ${customerName}` });
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
  const r = await db.reservation.findUnique({ where: { id: reservationId }, include: { items: true } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };
  if (r.paid) return { ok: false, error: "Reserva já está marcada como paga." };

  const total = reservationItems(r).reduce((s, it) => s + it.unitPrice * it.qty, 0);
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
  const r = await db.reservation.findUnique({ where: { id: reservationId }, include: { items: true } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };

  // Forma efetiva: se já pago, usa a forma do pagamento antecipado; senão a escolhida (default Pix).
  const effMethod = r.paid ? (r.paidMethod ?? "PIX_MANUAL") : (method ?? "PIX_MANUAL");
  if (!(RESERVA_PAYMENT_METHODS as readonly string[]).includes(effMethod)) return { ok: false, error: "Forma de pagamento inválida para reserva." };

  const lines = reservationItems(r);
  const variants = await db.productVariant.findMany({ where: { id: { in: lines.map((l) => l.variantId) } } });
  const costOf = (vid: string) => variants.find((v) => v.id === vid)?.cost ?? 0;
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const costTotal = lines.reduce((s, l) => s + costOf(l.variantId) * l.qty, 0);
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
          costTotal,
          shippingLabel: "Retirada / balcão",
          addressSnapshot: "{}",
          customerSnapshot: JSON.stringify({ name: r.customerName, email: "", phone: r.customerPhone }),
          paidAt: new Date(),
          handledById: staff.id,
          notes: `Venda de reserva. ${r.notes ?? ""}`.trim(),
          items: {
            create: lines.map((l) => ({
              variantId: l.variantId,
              brand: l.brand, productName: l.productName, type: l.type,
              size: l.size, color: l.color, sku: l.sku,
              unitPrice: l.unitPrice, unitCost: costOf(l.variantId), qty: l.qty, lineTotal: l.unitPrice * l.qty,
            })),
          },
          payments: effMethod !== "A_PRAZO"
            ? { create: [{ kind: "PAGAMENTO", method: effMethod, amount: subtotal, userId: staff.id, userName: staff.displayName }] }
            : undefined,
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
  const r = await db.reservation.findUnique({ where: { id: reservationId }, include: { items: true } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };

  const lines = reservationItems(r);
  await db.$transaction(async (tx) => {
    for (const l of lines) {
      await tx.productVariant.update({ where: { id: l.variantId }, data: { stock: { increment: l.qty } } });
      await tx.stockMovement.create({ data: { variantId: l.variantId, type: "ENTRADA", qty: l.qty, reason: `Reserva cancelada — ${r.customerName}`, userId: staff.id } });
    }
    await tx.reservation.update({ where: { id: reservationId }, data: { status: "CANCELADA", settledAt: new Date() } });
  });
  await logAudit({ staff, action: "DELETE", entity: "Reserva", entityId: reservationId, summary: `Cancelou a reserva de ${r.customerName} (estoque devolvido)` });
  revalidatePath("/backoffice/reservas");
  revalidatePath("/backoffice/estoque");
  return { ok: true };
}
