"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computePrice, getActivePromotions } from "@/lib/pricing";
import { parseReaisToCents } from "@/lib/money";
import { MANUAL_PAYMENT_METHODS } from "@/lib/enums";

function manualOrderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `HUX${yy}-V${Math.floor(100000 + Math.random() * 900000)}`;
}

const schema = z.object({
  customerName: z.string().min(2, "Informe o cliente."),
  customerPhone: z.string().optional(),
  sellerId: z.string().optional(),
  paymentMethod: z.enum(MANUAL_PAYMENT_METHODS),
  cardInstallments: z.coerce.number().int().min(1).max(12).optional(),
  discount: z.string().optional(),
  note: z.string().optional(),
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.coerce.number().int().positive() })).min(1, "Adicione ao menos um item."),
});

export async function createManualSaleAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string; number?: string }> {
  const staff = await requireModule("vendas");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const promos = await getActivePromotions();
  const lines: { variantId: string; brand: string; productName: string; type: string; size: string; color: string; sku: string; unitPrice: number; unitCost: number; qty: number }[] = [];
  for (const it of d.items) {
    const v = await db.productVariant.findUnique({ where: { id: it.variantId }, include: { product: true } });
    if (!v || !v.active) return { ok: false, error: "Produto indisponível." };
    if (v.stock < it.qty) return { ok: false, error: `Estoque insuficiente para ${v.product.name} (${v.size}/${v.color}).` };
    const { price } = computePrice(v.product, promos);
    lines.push({ variantId: v.id, brand: v.product.brand, productName: v.product.name, type: v.product.type, size: v.size, color: v.color, sku: v.sku, unitPrice: v.priceOverride ?? price, unitCost: v.cost, qty: it.qty });
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discountTotal = Math.min(subtotal, d.discount ? parseReaisToCents(d.discount) : 0);
  const total = subtotal - discountTotal;
  const costTotal = lines.reduce((s, l) => s + l.unitCost * l.qty, 0);
  const number = manualOrderNumber();

  let seller = null as { id: string; displayName: string } | null;
  if (d.sellerId) {
    const u = await db.user.findUnique({ where: { id: d.sellerId } });
    if (u) seller = { id: u.id, displayName: u.displayName };
  }
  seller = seller ?? { id: staff.id, displayName: staff.displayName };

  try {
    await db.$transaction(async (tx) => {
      for (const l of lines) {
        const fresh = await tx.productVariant.findUnique({ where: { id: l.variantId } });
        if (!fresh || fresh.stock < l.qty) throw new Error(`Estoque insuficiente para ${l.productName}.`);
        await tx.productVariant.update({ where: { id: l.variantId }, data: { stock: { decrement: l.qty } } });
        await tx.stockMovement.create({ data: { variantId: l.variantId, type: "SAIDA", qty: l.qty, reason: `Venda física ${number}`, orderId: null, userId: staff.id } });
      }
      await tx.order.create({
        data: {
          number, customerId: null, channel: "MANUAL", status: "PAGO",
          paymentMethod: d.paymentMethod, paymentStatus: "CONFIRMADO",
          cardInstallments: d.paymentMethod === "CARTAO" ? (d.cardInstallments ?? 1) : null,
          subtotal, discountTotal, shippingTotal: 0, total, costTotal,
          shippingLabel: "Venda física / balcão", addressSnapshot: "{}",
          customerSnapshot: JSON.stringify({ name: d.customerName, email: "", phone: d.customerPhone ?? null }),
          paidAt: new Date(), handledById: staff.id, soldByUserId: seller.id, soldByName: seller.displayName,
          notes: d.note || null,
          items: { create: lines.map((l) => ({ variantId: l.variantId, brand: l.brand, productName: l.productName, type: l.type, size: l.size, color: l.color, sku: l.sku, unitPrice: l.unitPrice, unitCost: l.unitCost, qty: l.qty, lineTotal: l.unitPrice * l.qty })) },
          events: { create: [{ status: "PAGO", note: "Venda física registrada." }] },
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao registrar venda." };
  }
  await logAudit({ staff, action: "SALE", entity: "Venda", entityId: number, summary: `Venda física ${number} — ${d.customerName} (${(total / 100).toFixed(2)}), vendedor ${seller.displayName}` });
  revalidatePath("/backoffice/vendas");
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice/estoque");
  revalidatePath("/backoffice");
  return { ok: true, number };
}
