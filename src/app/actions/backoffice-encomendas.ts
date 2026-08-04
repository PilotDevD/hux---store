"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { parseReaisToCents } from "@/lib/money";
import { BRANDS, PRODUCT_TYPES, SIZES, BACKORDER_STATUSES } from "@/lib/enums";

const schema = z.object({
  id: z.string().optional(),
  brand: z.string().optional(),
  productType: z.enum(PRODUCT_TYPES),
  modelName: z.string().optional(),
  size: z.enum(SIZES),
  color: z.string().min(1, "Informe a cor."),
  qty: z.coerce.number().int().positive(),
  customerName: z.string().min(2, "Informe o cliente."),
  customerPhone: z.string().optional(),
  expectedDate: z.string().optional(),
  estimatedPrice: z.string().optional(),
  notes: z.string().optional(),
});

export async function upsertBackorderAction(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string }> {
  await requireModule("encomendas");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const b = parsed.data;

  const data = {
    brand: b.brand && (BRANDS as readonly string[]).includes(b.brand) ? b.brand : null,
    productType: b.productType,
    modelName: b.modelName || null,
    size: b.size,
    color: b.color,
    qty: b.qty,
    customerName: b.customerName,
    customerPhone: b.customerPhone || null,
    expectedDate: b.expectedDate ? new Date(b.expectedDate) : null,
    estimatedPrice: b.estimatedPrice ? parseReaisToCents(b.estimatedPrice) : null,
    notes: b.notes || null,
  };

  if (b.id) await db.backorder.update({ where: { id: b.id }, data });
  else await db.backorder.create({ data: { ...data, status: "PENDENTE" } });

  revalidatePath("/backoffice/encomendas");
  return { ok: true };
}

export async function setBackorderStatusAction(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireModule("encomendas");
  if (!(BACKORDER_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Status inválido." };
  }
  await db.backorder.update({ where: { id }, data: { status } });
  revalidatePath("/backoffice/encomendas");
  return { ok: true };
}

export async function deleteBackorderAction(id: string): Promise<{ ok: boolean }> {
  await requireModule("encomendas");
  await db.backorder.delete({ where: { id } }).catch(() => {});
  revalidatePath("/backoffice/encomendas");
  return { ok: true };
}
