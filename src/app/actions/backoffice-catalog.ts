"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { parseReaisToCents } from "@/lib/money";
import { posterVariants } from "@/lib/poster";
import {
  BRANDS, GENDERS, PRODUCT_TYPES, SIZES, PROMOTION_TYPES, PROMOTION_SCOPES,
  COUPON_TYPES, MOVEMENT_TYPES, type ProductType,
} from "@/lib/enums";

// --------------------------- helpers ---------------------------------------

function skuFor(brand: string, type: string, size: string, color: string, seed: number): string {
  const b = brand.slice(0, 2).toUpperCase();
  const t = type.slice(0, 3).toUpperCase();
  const c = slugify(color).replace(/-/g, "").slice(0, 3).toUpperCase() || "STD";
  return `${b}-${t}-${size}-${c}${String(seed % 100).padStart(2, "0")}`;
}

function writePosters(slug: string, opts: { brand: string; name: string; type: ProductType; colorHex: string; colorName: string }): string[] {
  // Serverless (Netlify) has a read-only filesystem — if writing fails, the
  // product is simply created without a generated poster (UI shows a fallback).
  try {
    const dir = join(process.cwd(), "public", "products");
    mkdirSync(dir, { recursive: true });
    const svgs = posterVariants(opts);
    const paths: string[] = [];
    svgs.forEach((svg, i) => {
      const file = `${slug}-${i + 1}.svg`;
      writeFileSync(join(dir, file), svg, "utf8");
      paths.push(`/products/${file}`);
    });
    return paths;
  } catch {
    return [];
  }
}

// --------------------------- products --------------------------------------

const variantSchema = z.object({
  id: z.string().optional(),
  size: z.enum(SIZES),
  color: z.string().min(1),
  colorHex: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  priceOverride: z.string().optional(),
  cost: z.string().optional(),
});

const productSchema = z.object({
  id: z.string().optional(),
  brand: z.enum(BRANDS),
  name: z.string().min(2),
  modelName: z.string().optional(),
  type: z.enum(PRODUCT_TYPES),
  gender: z.enum(GENDERS),
  description: z.string().optional(),
  details: z.string().optional(),
  basePrice: z.string(),
  compareAtPrice: z.string().optional(),
  collectionId: z.string().optional(),
  images: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  variants: z.array(variantSchema).min(1, "Adicione ao menos uma variante."),
});

export type ProductInput = z.input<typeof productSchema>;

export async function upsertProductAction(
  input: ProductInput,
): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const staff = await requireModule("produtos");
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const p = parsed.data;
  const basePrice = parseReaisToCents(p.basePrice);
  const compareAt = p.compareAtPrice ? parseReaisToCents(p.compareAtPrice) : null;

  try {
    if (p.id) {
      // ------- update -------
      const existing = await db.product.findUnique({ where: { id: p.id }, include: { variants: true } });
      if (!existing) return { ok: false, error: "Produto não encontrado." };

      let images = existing.images;
      if (p.images && p.images.length) images = JSON.stringify(p.images.filter(Boolean));

      await db.product.update({
        where: { id: p.id },
        data: {
          brand: p.brand, name: p.name, modelName: p.modelName || null, type: p.type,
          gender: p.gender, description: p.description || null, details: p.details || null,
          basePrice, compareAtPrice: compareAt, collectionId: p.collectionId || null,
          featured: !!p.featured, active: p.active ?? true, images,
        },
      });

      // sync variants
      const keepIds = new Set(p.variants.filter((v) => v.id).map((v) => v.id));
      const toDelete = existing.variants.filter((v) => !keepIds.has(v.id));
      for (const v of toDelete) {
        await db.productVariant.update({ where: { id: v.id }, data: { active: false } });
      }
      let i = 0;
      for (const v of p.variants) {
        i++;
        const data = {
          size: v.size, color: v.color, colorHex: v.colorHex || null,
          stock: v.stock,
          priceOverride: v.priceOverride ? parseReaisToCents(v.priceOverride) : null,
          cost: v.cost ? parseReaisToCents(v.cost) : 0,
          active: true,
        };
        if (v.id) {
          await db.productVariant.update({ where: { id: v.id }, data });
        } else {
          await db.productVariant.create({
            data: { ...data, productId: p.id, sku: skuFor(p.brand, p.type, v.size, v.color, Date.now() + i) },
          });
        }
      }
      revalidatePath("/backoffice/produtos");
      revalidatePath(`/produto/${existing.slug}`);
      return { ok: true, slug: existing.slug };
    }

    // ------- create -------
    let slug = slugify(`${p.brand}-${p.name}`);
    const clash = await db.product.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const firstColor = p.variants[0];
    let images = p.images?.filter(Boolean) ?? [];
    if (images.length === 0) {
      images = writePosters(slug, {
        brand: p.brand, name: p.name, type: p.type,
        colorHex: firstColor.colorHex || "#22262E", colorName: firstColor.color,
      });
    }

    const created = await db.product.create({
      data: {
        slug, brand: p.brand, name: p.name, modelName: p.modelName || null, type: p.type,
        gender: p.gender, description: p.description || null, details: p.details || null,
        basePrice, compareAtPrice: compareAt, collectionId: p.collectionId || null,
        featured: !!p.featured, active: p.active ?? true, images: JSON.stringify(images),
        variants: {
          create: p.variants.map((v, idx) => ({
            size: v.size, color: v.color, colorHex: v.colorHex || null,
            stock: v.stock,
            priceOverride: v.priceOverride ? parseReaisToCents(v.priceOverride) : null,
            cost: v.cost ? parseReaisToCents(v.cost) : 0,
            sku: skuFor(p.brand, p.type, v.size, v.color, Date.now() + idx),
          })),
        },
      },
    });
    // stock-in movements for initial stock
    const variants = await db.productVariant.findMany({ where: { productId: created.id } });
    for (const v of variants) {
      if (v.stock > 0) {
        await db.stockMovement.create({
          data: { variantId: v.id, type: "ENTRADA", qty: v.stock, reason: "Cadastro inicial", userId: staff.id },
        });
      }
    }
    revalidatePath("/backoffice/produtos");
    return { ok: true, slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao salvar produto." };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  await requireModule("produtos");
  await db.product.update({ where: { id }, data: { active } });
  revalidatePath("/backoffice/produtos");
  return { ok: true };
}

export async function deleteProductAction(id: string) {
  await requireModule("produtos");
  // Soft approach: deactivate to preserve order history; variants deactivated too.
  await db.product.update({ where: { id }, data: { active: false } });
  await db.productVariant.updateMany({ where: { productId: id }, data: { active: false } });
  revalidatePath("/backoffice/produtos");
  return { ok: true };
}

// ----------------------------- stock ---------------------------------------

const stockSchema = z.object({
  variantId: z.string(),
  type: z.enum(MOVEMENT_TYPES),
  qty: z.coerce.number().int().positive(),
  reason: z.string().optional(),
});

export async function adjustStockAction(input: z.input<typeof stockSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("estoque");
  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { variantId, type, qty, reason } = parsed.data;

  const variant = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return { ok: false, error: "Variante não encontrada." };
  if (type === "SAIDA" && variant.stock < qty) return { ok: false, error: "Estoque insuficiente." };

  await db.$transaction([
    db.productVariant.update({
      where: { id: variantId },
      data: { stock: type === "ENTRADA" ? { increment: qty } : { decrement: qty } },
    }),
    db.stockMovement.create({
      data: { variantId, type, qty, reason: reason || (type === "ENTRADA" ? "Entrada manual" : "Saída manual"), userId: staff.id },
    }),
  ]);
  revalidatePath("/backoffice/estoque");
  revalidatePath("/backoffice/produtos");
  return { ok: true };
}

// --------------------------- promotions ------------------------------------

const promoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  type: z.enum(PROMOTION_TYPES),
  value: z.string(),
  scope: z.enum(PROMOTION_SCOPES),
  targetBrand: z.string().optional(),
  collectionId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  active: z.boolean().optional(),
});

export async function upsertPromotionAction(input: z.input<typeof promoSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireModule("promocoes");
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const p = parsed.data;
  const value = p.type === "PERCENT" ? Math.max(0, Math.min(100, Math.round(Number(p.value)))) : parseReaisToCents(p.value);

  const data = {
    name: p.name, type: p.type, value, scope: p.scope,
    targetBrand: p.scope === "BRAND" ? p.targetBrand || null : null,
    collectionId: p.scope === "COLLECTION" ? p.collectionId || null : null,
    startsAt: p.startsAt ? new Date(p.startsAt) : null,
    endsAt: p.endsAt ? new Date(p.endsAt) : null,
    active: p.active ?? true,
  };

  if (p.id) {
    await db.promotion.update({
      where: { id: p.id },
      data: { ...data, products: p.scope === "PRODUCT" ? { set: (p.productIds ?? []).map((id) => ({ id })) } : { set: [] } },
    });
  } else {
    await db.promotion.create({
      data: { ...data, products: p.scope === "PRODUCT" ? { connect: (p.productIds ?? []).map((id) => ({ id })) } : undefined },
    });
  }
  revalidatePath("/backoffice/promocoes");
  return { ok: true };
}

export async function deletePromotionAction(id: string) {
  await requireModule("promocoes");
  await db.promotion.delete({ where: { id } });
  revalidatePath("/backoffice/promocoes");
  return { ok: true };
}

// ----------------------------- coupons -------------------------------------

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(COUPON_TYPES),
  value: z.string().optional(),
  minOrder: z.string().optional(),
  maxUses: z.string().optional(),
  perCustomerLimit: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  active: z.boolean().optional(),
});

export async function upsertCouponAction(input: z.input<typeof couponSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireModule("cupons");
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const c = parsed.data;
  const code = c.code.toUpperCase().replace(/\s+/g, "");
  const value = c.type === "PERCENT"
    ? Math.max(0, Math.min(100, Math.round(Number(c.value || 0))))
    : c.type === "FIXED" ? parseReaisToCents(c.value || "0") : 0;

  const data = {
    code, description: c.description || null, type: c.type, value,
    minOrder: c.minOrder ? parseReaisToCents(c.minOrder) : 0,
    maxUses: c.maxUses ? Number(c.maxUses) : null,
    perCustomerLimit: c.perCustomerLimit ? Number(c.perCustomerLimit) : null,
    startsAt: c.startsAt ? new Date(c.startsAt) : null,
    endsAt: c.endsAt ? new Date(c.endsAt) : null,
    active: c.active ?? true,
  };

  try {
    if (c.id) await db.coupon.update({ where: { id: c.id }, data });
    else await db.coupon.create({ data });
  } catch {
    return { ok: false, error: "Código de cupom já existe." };
  }
  revalidatePath("/backoffice/cupons");
  return { ok: true };
}

export async function deleteCouponAction(id: string) {
  await requireModule("cupons");
  await db.coupon.delete({ where: { id } }).catch(() => {});
  revalidatePath("/backoffice/cupons");
  return { ok: true };
}
