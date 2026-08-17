"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computePrice, getActivePromotions } from "@/lib/pricing";
import { parseReaisToCents, formatCents } from "@/lib/money";
import { MANUAL_PAYMENT_METHODS } from "@/lib/enums";

function manualOrderNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `HUX${yy}-V${Math.floor(100000 + Math.random() * 900000)}`;
}

/** Split a financed amount into N monthly parcelas (remainder on the last). */
function buildAprazoPlan(financedCents: number, parcelas: number, firstDue: Date) {
  const n = Math.max(1, Math.min(24, Math.floor(parcelas || 1)));
  const base = Math.floor(financedCents / n);
  const plan: { seq: number; amount: number; dueDate: Date }[] = [];
  for (let i = 0; i < n; i++) {
    const amount = i === n - 1 ? financedCents - base * (n - 1) : base;
    const due = new Date(firstDue);
    due.setMonth(firstDue.getMonth() + i);
    due.setHours(23, 59, 59, 0);
    plan.push({ seq: i + 1, amount, dueDate: due });
  }
  return plan;
}

const schema = z.object({
  customerName: z.string().min(2, "Informe o cliente."),
  customerPhone: z.string().optional(),
  sellerId: z.string().optional(),
  paymentMethod: z.enum(MANUAL_PAYMENT_METHODS),
  cardInstallments: z.coerce.number().int().min(1).max(12).optional(),
  discount: z.string().optional(),
  note: z.string().optional(),
  // Vendas a prazo (crediário)
  downPayment: z.string().optional(),
  aprazoParcelas: z.coerce.number().int().min(1).max(24).optional(),
  firstDueDate: z.string().optional(),
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

  // --- a prazo (crediário) setup ---
  const isAprazo = d.paymentMethod === "A_PRAZO";
  let entrada = 0;
  let aprazoPlan: { seq: number; amount: number; dueDate: Date }[] = [];
  if (isAprazo) {
    entrada = Math.max(0, Math.min(total, d.downPayment ? parseReaisToCents(d.downPayment) : 0));
    const financed = total - entrada;
    if (financed <= 0) return { ok: false, error: "Para venda a prazo, a entrada deve ser menor que o total." };
    const firstDue = d.firstDueDate ? new Date(d.firstDueDate) : (() => { const dt = new Date(); dt.setMonth(dt.getMonth() + 1); return dt; })();
    if (isNaN(firstDue.getTime())) return { ok: false, error: "Data do primeiro vencimento inválida." };
    aprazoPlan = buildAprazoPlan(financed, d.aprazoParcelas ?? 1, firstDue);
  }

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
          number, customerId: null, channel: "MANUAL",
          status: isAprazo ? "ENTREGUE" : "PAGO",
          paymentMethod: d.paymentMethod,
          paymentStatus: isAprazo ? "PENDENTE" : "CONFIRMADO",
          cardInstallments: d.paymentMethod === "CARTAO" ? (d.cardInstallments ?? 1) : null,
          downPayment: isAprazo ? entrada : 0,
          subtotal, discountTotal, shippingTotal: 0, total, costTotal,
          shippingLabel: "Venda física / balcão", addressSnapshot: "{}",
          customerSnapshot: JSON.stringify({ name: d.customerName, email: "", phone: d.customerPhone ?? null }),
          paidAt: isAprazo ? null : new Date(),
          handledById: staff.id, soldByUserId: seller.id, soldByName: seller.displayName,
          notes: d.note || null,
          items: { create: lines.map((l) => ({ variantId: l.variantId, brand: l.brand, productName: l.productName, type: l.type, size: l.size, color: l.color, sku: l.sku, unitPrice: l.unitPrice, unitCost: l.unitCost, qty: l.qty, lineTotal: l.unitPrice * l.qty })) },
          events: {
            create: [{
              status: isAprazo ? "ENTREGUE" : "PAGO",
              note: isAprazo
                ? `Venda a prazo. Entrada ${formatCents(entrada)} + ${aprazoPlan.length}x. Produto entregue ao cliente.`
                : "Venda física registrada.",
            }],
          },
          installments: isAprazo && aprazoPlan.length
            ? { create: aprazoPlan.map((p) => ({ seq: p.seq, amount: p.amount, dueDate: p.dueDate, status: "PENDENTE" })) }
            : undefined,
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao registrar venda." };
  }
  await logAudit({
    staff, action: "SALE", entity: "Venda", entityId: number,
    summary: isAprazo
      ? `Venda a prazo ${number} — ${d.customerName} (${formatCents(total)}, entrada ${formatCents(entrada)}, ${aprazoPlan.length}x), vendedor ${seller.displayName}`
      : `Venda física ${number} — ${d.customerName} (${formatCents(total)}), vendedor ${seller.displayName}`,
  });
  revalidatePath("/backoffice/vendas");
  revalidatePath("/backoffice/a-prazo");
  revalidatePath("/backoffice/pedidos");
  revalidatePath("/backoffice/estoque");
  revalidatePath("/backoffice");
  return { ok: true, number };
}
