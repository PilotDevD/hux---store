"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  email: z.string().email("E-mail inválido."),
  size: z.string().optional(),
  color: z.string().optional(),
});

export async function requestBackInStockAction(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const { productId, variantId, email, size, color } = parsed.data;

  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true } });
  if (!product) return { ok: false, error: "Produto não encontrado." };

  // avoid duplicate pending requests for the same email + product + variant
  const existing = await db.stockNotifyRequest.findFirst({
    where: { productId, email: email.toLowerCase(), variantId: variantId ?? null, notified: false },
  });
  if (!existing) {
    await db.stockNotifyRequest.create({
      data: { productId, variantId: variantId ?? null, productName: product.name, email: email.toLowerCase(), size: size ?? null, color: color ?? null },
    });
  }
  return { ok: true };
}
