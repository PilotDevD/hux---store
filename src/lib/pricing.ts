import { db } from "./db";
import type { PromotionType, PromotionScope } from "./enums";

export type ActivePromotion = {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  scope: PromotionScope;
  targetBrand: string | null;
  collectionId: string | null;
  productIds: string[];
};

/** All currently-valid promotions (active + within date window). */
export async function getActivePromotions(): Promise<ActivePromotion[]> {
  const now = new Date();
  const rows = await db.promotion.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: { products: { select: { id: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as PromotionType,
    value: p.value,
    scope: p.scope as PromotionScope,
    targetBrand: p.targetBrand,
    collectionId: p.collectionId,
    productIds: p.products.map((x) => x.id),
  }));
}

type PriceableProduct = {
  id: string;
  brand: string;
  collectionId: string | null;
  basePrice: number;
  compareAtPrice: number | null;
};

export type ComputedPrice = {
  price: number; // current price (cents)
  compareAt: number | null; // struck-through reference (cents) or null
  promotionName: string | null;
};

function applyOne(base: number, type: PromotionType, value: number): number {
  const out = type === "PERCENT" ? Math.round(base * (1 - value / 100)) : base - value;
  return Math.max(0, out);
}

function matches(promo: ActivePromotion, product: PriceableProduct): boolean {
  switch (promo.scope) {
    case "ALL":
      return true;
    case "BRAND":
      return promo.targetBrand === product.brand;
    case "COLLECTION":
      return !!product.collectionId && promo.collectionId === product.collectionId;
    case "PRODUCT":
      return promo.productIds.includes(product.id);
    default:
      return false;
  }
}

/** Best price for a product given the active promotions. Pure + deterministic. */
export function computePrice(
  product: PriceableProduct,
  promotions: ActivePromotion[],
): ComputedPrice {
  let best = product.basePrice;
  let promoName: string | null = null;

  for (const promo of promotions) {
    if (!matches(promo, product)) continue;
    const candidate = applyOne(product.basePrice, promo.type, promo.value);
    if (candidate < best) {
      best = candidate;
      promoName = promo.name;
    }
  }

  if (promoName) {
    // A promotion is active — reference price is the base list price.
    return { price: best, compareAt: product.basePrice, promotionName: promoName };
  }
  // No promotion — show manual "de/por" if compareAtPrice is set above price.
  const compareAt =
    product.compareAtPrice && product.compareAtPrice > product.basePrice
      ? product.compareAtPrice
      : null;
  return { price: product.basePrice, compareAt, promotionName: null };
}
