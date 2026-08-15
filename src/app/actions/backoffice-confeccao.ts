"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseReaisToCents } from "@/lib/money";
import { PRODUCT_TYPES, SIZES, PRODUCTION_PHASES } from "@/lib/enums";

// ------------------------- matéria-prima -----------------------------------

const matSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Informe o tecido."),
  color: z.string().min(1, "Informe a cor."),
  supplier: z.string().optional(),
  quantity: z.coerce.number().min(0),
  unit: z.string().optional(),
  totalCost: z.string(),
  yieldPieces: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export async function upsertRawMaterialAction(input: z.input<typeof matSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("confeccao");
  const parsed = matSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const m = parsed.data;
  const data = {
    name: m.name, color: m.color, supplier: m.supplier || null,
    quantity: m.quantity, unit: m.unit || "kg", totalCost: parseReaisToCents(m.totalCost),
    yieldPieces: m.yieldPieces || null, notes: m.notes || null,
  };
  if (m.id) await db.rawMaterial.update({ where: { id: m.id }, data });
  else await db.rawMaterial.create({ data });
  await logAudit({ staff, action: m.id ? "UPDATE" : "CREATE", entity: "Matéria-prima", entityId: m.id ?? null, summary: `${m.id ? "Editou" : "Comprou"} tecido ${m.name} (${m.color})` });
  revalidatePath("/backoffice/confeccao");
  return { ok: true };
}

export async function deleteRawMaterialAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("confeccao");
  await db.rawMaterial.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "DELETE", entity: "Matéria-prima", entityId: id, summary: `Removeu matéria-prima ${id}` });
  revalidatePath("/backoffice/confeccao");
  return { ok: true };
}

// ------------------------- ordens de produção ------------------------------

const jobSchema = z.object({
  id: z.string().optional(),
  rawMaterialId: z.string().optional(),
  brand: z.string().optional(),
  productType: z.enum(PRODUCT_TYPES),
  modelName: z.string().optional(),
  color: z.string().min(1, "Informe a cor."),
  size: z.enum(SIZES).optional(),
  qty: z.coerce.number().int().positive(),
  forCustomerName: z.string().optional(),
  unitCost: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function upsertProductionJobAction(input: z.input<typeof jobSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("confeccao");
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const j = parsed.data;

  // inherit unit cost from raw material (totalCost / yield) when not provided
  let unitCost = j.unitCost ? parseReaisToCents(j.unitCost) : null;
  if (unitCost == null && j.rawMaterialId) {
    const mat = await db.rawMaterial.findUnique({ where: { id: j.rawMaterialId } });
    if (mat?.yieldPieces && mat.yieldPieces > 0) unitCost = Math.round(mat.totalCost / mat.yieldPieces);
  }

  const data = {
    rawMaterialId: j.rawMaterialId || null,
    brand: j.brand || null, productType: j.productType, modelName: j.modelName || null,
    color: j.color, size: j.size || null, qty: j.qty, forCustomerName: j.forCustomerName || null,
    unitCost, dueDate: j.dueDate ? new Date(j.dueDate) : null, notes: j.notes || null,
    handledById: staff.id,
  };
  if (j.id) await db.productionJob.update({ where: { id: j.id }, data });
  else await db.productionJob.create({ data: { ...data, phase: "CONFECCAO" } });
  await logAudit({ staff, action: j.id ? "UPDATE" : "CREATE", entity: "Confecção", entityId: j.id ?? null, summary: `${j.id ? "Editou" : "Criou"} produção de ${j.qty}x ${j.productType} ${j.color}${j.forCustomerName ? ` p/ ${j.forCustomerName}` : ""}` });
  revalidatePath("/backoffice/confeccao");
  return { ok: true };
}

/** Advance CONFECCAO → ESTAMPARIA → FINALIZADA. On finalize, tries to add to stock. */
export async function advanceProductionPhaseAction(id: string): Promise<{ ok: boolean; error?: string; addedToStock?: boolean }> {
  const staff = await requireModule("confeccao");
  const job = await db.productionJob.findUnique({ where: { id } });
  if (!job) return { ok: false, error: "Produção não encontrada." };
  const idx = PRODUCTION_PHASES.indexOf(job.phase as (typeof PRODUCTION_PHASES)[number]);
  if (idx < 0 || idx >= PRODUCTION_PHASES.length - 1) return { ok: false, error: "Produção já finalizada." };
  const next = PRODUCTION_PHASES[idx + 1];

  let addedToStock = false;
  await db.$transaction(async (tx) => {
    await tx.productionJob.update({ where: { id }, data: { phase: next, finalizedAt: next === "FINALIZADA" ? new Date() : null } });
    // On finalize, if a matching active variant exists, add the produced qty to stock.
    if (next === "FINALIZADA" && job.brand && job.size) {
      const variant = await tx.productVariant.findFirst({
        where: { active: true, size: job.size, color: { equals: job.color, mode: "insensitive" }, product: { brand: job.brand, type: job.productType, active: true } },
      });
      if (variant) {
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: job.qty } } });
        await tx.stockMovement.create({ data: { variantId: variant.id, type: "ENTRADA", qty: job.qty, reason: "Confecção finalizada", userId: staff.id } });
        addedToStock = true;
      }
    }
  });
  await logAudit({ staff, action: "STATUS", entity: "Confecção", entityId: id, summary: `Produção → ${next}${addedToStock ? " (deu entrada no estoque)" : ""}` });
  revalidatePath("/backoffice/confeccao");
  revalidatePath("/backoffice/estoque");
  return { ok: true, addedToStock };
}

export async function deleteProductionJobAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("confeccao");
  await db.productionJob.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "DELETE", entity: "Confecção", entityId: id, summary: `Removeu ordem de produção ${id}` });
  revalidatePath("/backoffice/confeccao");
  return { ok: true };
}
