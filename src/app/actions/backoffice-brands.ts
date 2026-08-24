"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

// ------------------------------- brands ------------------------------------

const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da marca."),
  tagline: z.string().optional(),
  blurb: z.string().optional(),
  accent: z.string().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function upsertBrandAction(input: z.input<typeof brandSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("marcas");
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const b = parsed.data;
  const name = b.name.trim().toUpperCase();
  const slug = slugify(name);
  const data = {
    name, slug,
    tagline: b.tagline?.trim() || null,
    blurb: b.blurb?.trim() || null,
    accent: b.accent?.trim() || null,
    active: b.active ?? true,
    sortOrder: b.sortOrder ?? 0,
  };

  try {
    if (b.id) {
      const existing = await db.brand.findUnique({ where: { id: b.id } });
      if (!existing) return { ok: false, error: "Marca não encontrada." };
      await db.brand.update({ where: { id: b.id }, data });
      // Rename cascade: keep products in sync with the brand's new name.
      if (existing.name !== name) {
        await db.product.updateMany({ where: { brand: existing.name }, data: { brand: name } });
      }
    } else {
      await db.brand.create({ data });
    }
  } catch {
    return { ok: false, error: "Já existe uma marca com esse nome." };
  }
  await logAudit({ staff, action: b.id ? "UPDATE" : "CREATE", entity: "Marca", entityId: b.id ?? null, summary: `${b.id ? "Editou" : "Criou"} a marca ${name}` });
  revalidatePath("/backoffice/marcas");
  revalidatePath("/backoffice/produtos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBrandAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("marcas");
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) return { ok: false, error: "Marca não encontrada." };
  const inUse = await db.product.count({ where: { brand: brand.name } });
  if (inUse > 0) return { ok: false, error: `Não é possível excluir: ${inUse} produto(s) usam a marca ${brand.name}. Reatribua ou remova-os antes.` };
  await db.brand.delete({ where: { id } });
  await logAudit({ staff, action: "DELETE", entity: "Marca", entityId: id, summary: `Removeu a marca ${brand.name}` });
  revalidatePath("/backoffice/marcas");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ----------------------------- collections ---------------------------------

const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da coleção."),
  description: z.string().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function upsertCollectionAction(input: z.input<typeof collectionSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("marcas");
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const c = parsed.data;
  const name = c.name.trim();
  let slug = slugify(name);

  try {
    if (c.id) {
      await db.collection.update({
        where: { id: c.id },
        data: { name, description: c.description?.trim() || null, active: c.active ?? true, sortOrder: c.sortOrder ?? 0 },
      });
    } else {
      const clash = await db.collection.findUnique({ where: { slug } });
      if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      await db.collection.create({
        data: { slug, name, description: c.description?.trim() || null, active: c.active ?? true, sortOrder: c.sortOrder ?? 0 },
      });
    }
  } catch {
    return { ok: false, error: "Erro ao salvar a coleção." };
  }
  await logAudit({ staff, action: c.id ? "UPDATE" : "CREATE", entity: "Coleção", entityId: c.id ?? null, summary: `${c.id ? "Editou" : "Criou"} a coleção "${name}"` });
  revalidatePath("/backoffice/marcas");
  revalidatePath("/backoffice/produtos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCollectionAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("marcas");
  const collection = await db.collection.findUnique({ where: { id } });
  if (!collection) return { ok: false, error: "Coleção não encontrada." };
  // Products keep existing; their collectionId is set to null (schema onDelete: SetNull).
  await db.collection.delete({ where: { id } });
  await logAudit({ staff, action: "DELETE", entity: "Coleção", entityId: id, summary: `Removeu a coleção "${collection.name}"` });
  revalidatePath("/backoffice/marcas");
  revalidatePath("/backoffice/produtos");
  revalidatePath("/", "layout");
  return { ok: true };
}
