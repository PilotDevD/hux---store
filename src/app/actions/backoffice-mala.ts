"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computePrice, getActivePromotions } from "@/lib/pricing";

function malaOrderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `HUX${yy}-M${Math.floor(100000 + Math.random() * 900000)}`;
}

const createSchema = z.object({
  customerName: z.string().min(2, "Informe o cliente."),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  prazoDays: z.coerce.number().int().min(1).max(60),
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.coerce.number().int().positive() })).min(1, "Adicione ao menos um produto."),
});

export async function createMalaAction(input: z.input<typeof createSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("mala");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const { customerName, customerPhone, notes, prazoDays, items } = parsed.data;

  const promos = await getActivePromotions();
  const rows: { variantId: string; brand: string; productName: string; type: string; size: string; color: string; sku: string; unitPrice: number; qty: number }[] = [];
  for (const it of items) {
    const v = await db.productVariant.findUnique({ where: { id: it.variantId }, include: { product: true } });
    if (!v || !v.active) return { ok: false, error: "Produto indisponível na mala." };
    if (v.stock < it.qty) return { ok: false, error: `Estoque insuficiente para ${v.product.name} (${v.size}/${v.color}).` };
    const { price } = computePrice(v.product, promos);
    rows.push({
      variantId: v.id, brand: v.product.brand, productName: v.product.name, type: v.product.type,
      size: v.size, color: v.color, sku: v.sku, unitPrice: v.priceOverride ?? price, qty: it.qty,
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + prazoDays);

  try {
    await db.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.productVariant.update({ where: { id: r.variantId }, data: { stock: { decrement: r.qty } } });
        await tx.stockMovement.create({ data: { variantId: r.variantId, type: "SAIDA", qty: r.qty, reason: `Mala HUX — ${customerName}`, userId: staff.id } });
      }
      await tx.mala.create({
        data: {
          customerName, customerPhone: customerPhone || null, notes: notes || null,
          status: "COM_CLIENTE", handledById: staff.id, expiresAt,
          items: { create: rows.map((r) => ({ ...r })) },
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar mala." };
  }
  await logAudit({ staff, action: "CREATE", entity: "Mala HUX", summary: `Montou mala para ${customerName} (${rows.length} itens, ${prazoDays} dias)` });
  revalidatePath("/backoffice/mala");
  revalidatePath("/backoffice/estoque");
  return { ok: true };
}

/** Acerto da mala: por item COMPROU (vira venda) ou DEVOLVEU (volta ao estoque). */
export async function settleMalaAction(
  malaId: string,
  decisions: Record<string, "COMPROU" | "DEVOLVEU">,
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const staff = await requireModule("mala");
  const mala = await db.mala.findUnique({ where: { id: malaId }, include: { items: true } });
  if (!mala) return { ok: false, error: "Mala não encontrada." };
  if (mala.status !== "COM_CLIENTE") return { ok: false, error: "Mala já finalizada." };

  const bought = mala.items.filter((i) => decisions[i.id] === "COMPROU");
  const returned = mala.items.filter((i) => decisions[i.id] !== "COMPROU"); // default devolveu

  let number: string | undefined;
  try {
    await db.$transaction(async (tx) => {
      // returned items go back to stock
      for (const it of returned) {
        await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
        await tx.stockMovement.create({ data: { variantId: it.variantId, type: "ENTRADA", qty: it.qty, reason: `Mala devolvida — ${mala.customerName}`, userId: staff.id } });
        await tx.malaItem.update({ where: { id: it.id }, data: { decision: "DEVOLVEU" } });
      }
      // bought items become a paid sale (stock already out)
      if (bought.length > 0) {
        number = malaOrderNumber();
        const subtotal = bought.reduce((s, i) => s + i.unitPrice * i.qty, 0);
        const variants = await tx.productVariant.findMany({ where: { id: { in: bought.map((b) => b.variantId) } } });
        const costOf = (vid: string) => variants.find((v) => v.id === vid)?.cost ?? 0;
        await tx.order.create({
          data: {
            number, customerId: null, channel: "MANUAL", status: "PAGO",
            paymentMethod: "PIX_MANUAL", paymentStatus: "CONFIRMADO",
            subtotal, discountTotal: 0, shippingTotal: 0, total: subtotal,
            costTotal: bought.reduce((s, i) => s + costOf(i.variantId) * i.qty, 0),
            shippingLabel: "Mala HUX", addressSnapshot: "{}",
            customerSnapshot: JSON.stringify({ name: mala.customerName, email: "", phone: mala.customerPhone }),
            paidAt: new Date(), handledById: staff.id, soldByUserId: staff.id, soldByName: staff.displayName,
            notes: `Venda originada de Mala HUX.`,
            items: { create: bought.map((i) => ({ variantId: i.variantId, brand: i.brand, productName: i.productName, type: i.type, size: i.size, color: i.color, sku: i.sku, unitPrice: i.unitPrice, unitCost: costOf(i.variantId), qty: i.qty, lineTotal: i.unitPrice * i.qty })) },
            events: { create: [{ status: "PAGO", note: "Acerto de Mala HUX." }] },
          },
        });
        for (const it of bought) await tx.malaItem.update({ where: { id: it.id }, data: { decision: "COMPROU" } });
      }
      await tx.mala.update({ where: { id: malaId }, data: { status: "FINALIZADA", settledAt: new Date(), orderNumber: number ?? null } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro no acerto da mala." };
  }
  await logAudit({ staff, action: "STATUS", entity: "Mala HUX", entityId: malaId, summary: `Acerto da mala de ${mala.customerName}: ${bought.length} comprou, ${returned.length} devolveu${number ? ` → pedido ${number}` : ""}` });
  revalidatePath("/backoffice/mala");
  revalidatePath("/backoffice/estoque");
  revalidatePath("/backoffice/pedidos");
  return { ok: true, number };
}

export async function cancelMalaAction(malaId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("mala");
  const mala = await db.mala.findUnique({ where: { id: malaId }, include: { items: true } });
  if (!mala) return { ok: false, error: "Mala não encontrada." };
  if (mala.status !== "COM_CLIENTE") return { ok: false, error: "Mala já finalizada." };

  await db.$transaction(async (tx) => {
    for (const it of mala.items) {
      await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
      await tx.stockMovement.create({ data: { variantId: it.variantId, type: "ENTRADA", qty: it.qty, reason: `Mala cancelada — ${mala.customerName}`, userId: staff.id } });
    }
    await tx.mala.update({ where: { id: malaId }, data: { status: "CANCELADA", settledAt: new Date() } });
  });
  await logAudit({ staff, action: "DELETE", entity: "Mala HUX", entityId: malaId, summary: `Cancelou a mala de ${mala.customerName} (estoque devolvido)` });
  revalidatePath("/backoffice/mala");
  revalidatePath("/backoffice/estoque");
  return { ok: true };
}
