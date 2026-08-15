"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { computePrice, getActivePromotions } from "@/lib/pricing";
import { logAudit } from "@/lib/audit";

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

/** "Fechar venda" — turns an active reservation into a paid order (stock already held). */
export async function closeReservationAction(
  reservationId: string,
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const staff = await requireModule("reservas");
  const r = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!r) return { ok: false, error: "Reserva não encontrada." };
  if (r.status !== "ATIVA") return { ok: false, error: "Reserva já finalizada ou cancelada." };

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
          paymentMethod: "PIX_MANUAL",
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
              { status: "PAGO", note: "Pagamento confirmado no fechamento da reserva." },
            ],
          },
        },
      });
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "FINALIZADA", orderNumber: number, settledAt: new Date() },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao fechar venda." };
  }
  await logAudit({ staff, action: "STATUS", entity: "Reserva", entityId: reservationId, summary: `Fechou a venda da reserva → pedido ${number}` });
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
