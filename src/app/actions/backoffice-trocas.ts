"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computePrice, getActivePromotions } from "@/lib/pricing";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";

function returnNumber(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `TR${yy}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export type ReturnLookupItem = {
  orderItemId: string;
  variantId: string | null;
  brand: string;
  productName: string;
  type: string;
  size: string;
  color: string;
  sku: string;
  unitPrice: number;
  qty: number;
  returnedQty: number;
  availableQty: number;
};

export type ReturnLookup = {
  ok: boolean;
  error?: string;
  order?: {
    number: string;
    customerName: string;
    createdAt: string;
    status: string;
    total: number;
    items: ReturnLookupItem[];
  };
};

/** Look up an order by number and return its lines with already-returned qty. */
export async function lookupOrderForReturnAction(numberRaw: string): Promise<ReturnLookup> {
  await requireModule("trocas");
  const number = numberRaw.trim().toUpperCase();
  if (!number) return { ok: false, error: "Informe o código da venda." };

  const order = await db.order.findUnique({
    where: { number },
    include: { items: true, customer: { select: { name: true } } },
  });
  if (!order) return { ok: false, error: "Venda não encontrada. Confira o código." };
  if (order.status === "CANCELADO") return { ok: false, error: "Esta venda está cancelada." };

  // How much of each line was already returned/exchanged.
  const priorItems = await db.returnItem.findMany({
    where: { request: { orderId: order.id } },
    select: { orderItemId: true, qty: true },
  });
  const returnedByItem = new Map<string, number>();
  for (const p of priorItems) {
    if (!p.orderItemId) continue;
    returnedByItem.set(p.orderItemId, (returnedByItem.get(p.orderItemId) ?? 0) + p.qty);
  }

  const customerName =
    order.customer?.name ?? parseJson<{ name?: string }>(order.customerSnapshot, {}).name ?? "Cliente";

  const items: ReturnLookupItem[] = order.items.map((it) => {
    const returnedQty = returnedByItem.get(it.id) ?? 0;
    return {
      orderItemId: it.id,
      variantId: it.variantId,
      brand: it.brand,
      productName: it.productName,
      type: it.type,
      size: it.size,
      color: it.color,
      sku: it.sku,
      unitPrice: it.unitPrice,
      qty: it.qty,
      returnedQty,
      availableQty: Math.max(0, it.qty - returnedQty),
    };
  });

  return {
    ok: true,
    order: {
      number: order.number,
      customerName,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      total: order.total,
      items,
    },
  };
}

const schema = z.object({
  orderNumber: z.string().min(1),
  reason: z.string().min(3, "Descreva o motivo da troca/devolução."),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
        mode: z.enum(["DEVOLVER", "TROCAR"]),
        newVariantId: z.string().optional(),
      }),
    )
    .min(1, "Selecione ao menos um item."),
});

export async function processReturnAction(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const staff = await requireModule("trocas");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const order = await db.order.findUnique({
    where: { number: d.orderNumber.trim().toUpperCase() },
    include: { items: true, customer: { select: { name: true } } },
  });
  if (!order) return { ok: false, error: "Venda não encontrada." };
  if (order.status === "CANCELADO") return { ok: false, error: "Esta venda está cancelada." };

  // Already-returned per line (to cap quantities).
  const priorItems = await db.returnItem.findMany({
    where: { request: { orderId: order.id } },
    select: { orderItemId: true, qty: true },
  });
  const returnedByItem = new Map<string, number>();
  for (const p of priorItems) {
    if (!p.orderItemId) continue;
    returnedByItem.set(p.orderItemId, (returnedByItem.get(p.orderItemId) ?? 0) + p.qty);
  }

  const promos = await getActivePromotions();
  const number = returnNumber();
  const customerName =
    order.customer?.name ?? parseJson<{ name?: string }>(order.customerSnapshot, {}).name ?? "Cliente";

  type BuiltItem = {
    orderItemId: string; mode: string; variantId: string | null;
    productName: string; size: string; color: string; sku: string; qty: number; unitPrice: number;
    newVariantId: string | null; newProductName: string | null; newSize: string | null;
    newColor: string | null; newSku: string | null; newUnitPrice: number | null;
    // side effects
    restockVariantId: string | null; decVariantId: string | null;
  };
  const built: BuiltItem[] = [];
  let refundAmount = 0;
  let exchangeDiff = 0;
  let hasTroca = false;

  for (const req of d.items) {
    const line = order.items.find((x) => x.id === req.orderItemId);
    if (!line) return { ok: false, error: "Item do pedido não encontrado." };
    const available = line.qty - (returnedByItem.get(line.id) ?? 0);
    if (req.qty > available) {
      return { ok: false, error: `"${line.productName}" tem apenas ${available} un. disponível(is) para troca/devolução.` };
    }

    if (req.mode === "TROCAR") {
      hasTroca = true;
      if (!req.newVariantId) return { ok: false, error: `Escolha o produto de troca para "${line.productName}".` };
      const nv = await db.productVariant.findUnique({ where: { id: req.newVariantId }, include: { product: true } });
      if (!nv || !nv.active || !nv.product.active) return { ok: false, error: "Produto de troca indisponível." };
      if (nv.stock < req.qty) return { ok: false, error: `Estoque insuficiente do produto de troca (${nv.product.name} ${nv.size}/${nv.color}).` };
      const { price } = computePrice(nv.product, promos);
      const newUnit = nv.priceOverride ?? price;
      exchangeDiff += (newUnit - line.unitPrice) * req.qty;
      built.push({
        orderItemId: line.id, mode: "TROCAR", variantId: line.variantId,
        productName: line.productName, size: line.size, color: line.color, sku: line.sku,
        qty: req.qty, unitPrice: line.unitPrice,
        newVariantId: nv.id, newProductName: nv.product.name, newSize: nv.size, newColor: nv.color, newSku: nv.sku, newUnitPrice: newUnit,
        restockVariantId: line.variantId, decVariantId: nv.id,
      });
    } else {
      refundAmount += line.unitPrice * req.qty;
      built.push({
        orderItemId: line.id, mode: "DEVOLVER", variantId: line.variantId,
        productName: line.productName, size: line.size, color: line.color, sku: line.sku,
        qty: req.qty, unitPrice: line.unitPrice,
        newVariantId: null, newProductName: null, newSize: null, newColor: null, newSku: null, newUnitPrice: null,
        restockVariantId: line.variantId, decVariantId: null,
      });
    }
  }

  const type = hasTroca ? "TROCA" : "DEVOLUCAO";

  try {
    await db.$transaction(async (tx) => {
      // Re-validate exchange stock inside the transaction.
      for (const b of built) {
        if (b.decVariantId) {
          const fresh = await tx.productVariant.findUnique({ where: { id: b.decVariantId } });
          if (!fresh || fresh.stock < b.qty) throw new Error(`Estoque insuficiente do produto de troca (${b.newProductName}).`);
        }
      }

      const created = await tx.returnRequest.create({
        data: {
          number, orderId: order.id, orderNumber: order.number, type, reason: d.reason.trim(),
          customerName, refundAmount, exchangeDiff,
          handledById: staff.id, handledByName: staff.displayName,
          items: {
            create: built.map((b) => ({
              orderItemId: b.orderItemId, mode: b.mode, variantId: b.variantId,
              productName: b.productName, size: b.size, color: b.color, sku: b.sku, qty: b.qty, unitPrice: b.unitPrice,
              newVariantId: b.newVariantId, newProductName: b.newProductName, newSize: b.newSize,
              newColor: b.newColor, newSku: b.newSku, newUnitPrice: b.newUnitPrice,
            })),
          },
        },
      });

      for (const b of built) {
        // Return the original piece(s) to stock.
        if (b.restockVariantId) {
          await tx.productVariant.update({ where: { id: b.restockVariantId }, data: { stock: { increment: b.qty } } });
          await tx.stockMovement.create({
            data: {
              variantId: b.restockVariantId, type: "ENTRADA", qty: b.qty,
              reason: `${type === "TROCA" ? "Troca" : "Devolução"} ${number} — pedido ${order.number}`,
              orderId: order.id, userId: staff.id,
            },
          });
        }
        // Ship out the exchanged-for piece(s).
        if (b.decVariantId) {
          await tx.productVariant.update({ where: { id: b.decVariantId }, data: { stock: { decrement: b.qty } } });
          await tx.stockMovement.create({
            data: {
              variantId: b.decVariantId, type: "SAIDA", qty: b.qty,
              reason: `Troca ${number} — pedido ${order.number}`,
              orderId: order.id, userId: staff.id,
            },
          });
        }
      }

      // Trace on the order timeline.
      const parts: string[] = [];
      if (refundAmount > 0) parts.push(`reembolso ${formatCents(refundAmount)}`);
      if (hasTroca) parts.push(exchangeDiff >= 0 ? `diferença a cobrar ${formatCents(exchangeDiff)}` : `diferença a devolver ${formatCents(-exchangeDiff)}`);
      await tx.orderEvent.create({
        data: {
          orderId: order.id, status: order.status,
          note: `${type === "TROCA" ? "Troca" : "Devolução"} ${number}${parts.length ? ` — ${parts.join(", ")}` : ""}. Motivo: ${d.reason.trim()}`,
        },
      });

      return created;
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao processar." };
  }

  await logAudit({
    staff, action: "RETURN", entity: type === "TROCA" ? "Troca" : "Devolução", entityId: number,
    summary: `${type === "TROCA" ? "Troca" : "Devolução"} ${number} do pedido ${order.number} — ${customerName}${refundAmount > 0 ? ` (reembolso ${formatCents(refundAmount)})` : ""}${hasTroca ? ` (dif. ${formatCents(exchangeDiff)})` : ""}`,
  });
  revalidatePath("/backoffice/trocas");
  revalidatePath("/backoffice/estoque");
  revalidatePath(`/backoffice/pedidos/${order.number}`);
  revalidatePath("/backoffice");
  return { ok: true, number };
}
