"use server";

import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { reaisToCents } from "@/lib/money";
import { parseInvoice, type NfResult } from "@/lib/nfe-ai";
import { BRANDS, PRODUCT_TYPES, SIZES, GENDERS } from "@/lib/enums";

const inList = (v: string, list: readonly string[], fallback: string) =>
  list.includes((v || "").toUpperCase()) ? (v || "").toUpperCase() : fallback;

export async function parseNfAction(formData: FormData): Promise<NfResult> {
  await requireModule("notafiscal");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Envie uma imagem da nota." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "Imagem muito grande (máx 8MB)." };
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mediaType = file.type || "image/jpeg";
  return parseInvoice(base64, mediaType);
}

type RegisterItem = {
  description: string; brand: string; type: string; gender: string;
  size: string; color: string; qty: number; unitCost: string; // unitCost reais string
};

export async function registerNfAction(input: {
  supplier: string;
  items: RegisterItem[];
}): Promise<{ ok: boolean; error?: string; created?: number; updated?: number }> {
  const staff = await requireModule("notafiscal");
  const supplier = (input.supplier || "fornecedor").trim();
  if (!input.items?.length) return { ok: false, error: "Nenhum item para cadastrar." };

  let created = 0, updated = 0;

  try {
    for (const raw of input.items) {
      const brand = inList(raw.brand, BRANDS, "HUX");
      const type = inList(raw.type, PRODUCT_TYPES, "ACESSORIO");
      const gender = inList(raw.gender, GENDERS, "UNISSEX");
      const size = inList(raw.size, SIZES, "UNICO");
      const color = (raw.color || "Padrão").trim();
      const qty = Math.max(1, Math.floor(Number(raw.qty) || 1));
      const costCents = reaisToCents(Number(String(raw.unitCost).replace(",", ".")) || 0);

      // match existing active variant (brand+type+size+color)
      const variant = await db.productVariant.findFirst({
        where: { active: true, size, color: { equals: color, mode: "insensitive" }, product: { brand, type, active: true } },
      });

      if (variant) {
        await db.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: qty }, cost: costCents || variant.cost } });
        await db.stockMovement.create({ data: { variantId: variant.id, type: "ENTRADA", qty, reason: `Nota fiscal — ${supplier}`, userId: staff.id } });
        updated++;
      } else {
        const name = (raw.description || `${brand} ${type}`).trim().slice(0, 80);
        let slug = slugify(`${brand}-${name}`) || `nf-${Date.now().toString(36)}`;
        if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        const sku = `${brand.slice(0, 2)}-${type.slice(0, 3)}-${size}-${slugify(color).replace(/-/g, "").slice(0, 3).toUpperCase() || "STD"}${Math.floor(Math.random() * 90 + 10)}`.toUpperCase();
        await db.product.create({
          data: {
            slug, brand, name, type, gender,
            description: `Cadastrado via nota fiscal (${supplier}).`,
            basePrice: Math.max(costCents * 2, costCents + 1000), // suggested price = 2x custo
            images: "[]", active: true,
            variants: { create: [{ size, color, sku, stock: qty, cost: costCents }] },
          },
        });
        // record the entry movement for the freshly created variant
        const v = await db.productVariant.findUnique({ where: { sku } });
        if (v) await db.stockMovement.create({ data: { variantId: v.id, type: "ENTRADA", qty, reason: `Nota fiscal — ${supplier} (produto novo)`, userId: staff.id } });
        created++;
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao cadastrar itens." };
  }

  await logAudit({ staff, action: "STOCK", entity: "Nota Fiscal", summary: `Entrada por NF de ${supplier}: ${created} novo(s), ${updated} reabastecido(s)` });
  return { ok: true, created, updated };
}
