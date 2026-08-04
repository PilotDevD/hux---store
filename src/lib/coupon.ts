import { db } from "./db";

export type CouponResult = {
  ok: boolean;
  error?: string;
  code?: string;
  couponId?: string;
  type?: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  discountCents?: number; // discount applied to subtotal (not shipping)
  freeShipping?: boolean;
  description?: string;
};

/**
 * Validate a coupon against a cart subtotal (cents) for a given customer.
 * Discount for FREE_SHIPPING is applied to the shipping total by the caller.
 */
export async function validateCoupon(
  rawCode: string,
  subtotalCents: number,
  customerId?: string | null,
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Informe um cupom." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return { ok: false, error: "Cupom inválido." };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Cupom ainda não está válido." };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: "Cupom expirado." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, error: "Cupom esgotado." };
  if (subtotalCents < coupon.minOrder)
    return {
      ok: false,
      error: `Pedido mínimo de R$ ${(coupon.minOrder / 100).toFixed(2).replace(".", ",")} para este cupom.`,
    };

  if (coupon.perCustomerLimit != null && customerId) {
    const used = await db.order.count({
      where: { customerId, couponId: coupon.id, status: { not: "CANCELADO" } },
    });
    if (used >= coupon.perCustomerLimit)
      return { ok: false, error: "Você já utilizou este cupom." };
  }

  const type = coupon.type as CouponResult["type"];
  let discountCents = 0;
  let freeShipping = false;
  if (type === "PERCENT") discountCents = Math.round(subtotalCents * (coupon.value / 100));
  else if (type === "FIXED") discountCents = Math.min(coupon.value, subtotalCents);
  else if (type === "FREE_SHIPPING") freeShipping = true;

  return {
    ok: true,
    code,
    couponId: coupon.id,
    type,
    discountCents,
    freeShipping,
    description: coupon.description ?? undefined,
  };
}
