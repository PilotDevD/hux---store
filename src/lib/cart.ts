import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { parseJson } from "./utils";
import { computePrice, getActivePromotions } from "./pricing";

const CART_COOKIE = "hux_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function newToken() {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

/**
 * Ensure a Cart row + cookie exist. MUTATES cookies — only call from a Server
 * Action or Route Handler (never during a page/layout render).
 */
export async function getOrCreateCart(customerId?: string | null) {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value;

  let cart = token ? await db.cart.findUnique({ where: { token } }) : null;

  if (!cart) {
    token = newToken();
    cart = await db.cart.create({ data: { token, customerId: customerId ?? null } });
    jar.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CART_MAX_AGE,
    });
  } else if (customerId && cart.customerId !== customerId) {
    cart = await db.cart.update({ where: { id: cart.id }, data: { customerId } });
  }
  return cart;
}

/**
 * Read-only cart lookup — safe to call during render. Never writes cookies or
 * creates rows. Returns null when there is no cart yet.
 */
async function findCart(customerId?: string | null) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const cart = await db.cart.findUnique({ where: { token } });
    if (cart) return cart;
  }
  if (customerId) {
    return db.cart.findFirst({
      where: { customerId },
      orderBy: { updatedAt: "desc" },
    });
  }
  return null;
}

const EMPTY_CART: CartDetailed = { id: "", token: "", lines: [], count: 0, subtotal: 0 };

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  slug: string;
  brand: string;
  name: string;
  type: string;
  size: string;
  color: string;
  colorHex: string | null;
  image: string | null;
  qty: number;
  unitPrice: number;
  compareAt: number | null;
  lineTotal: number;
  maxStock: number;
};

export type CartDetailed = {
  id: string;
  token: string;
  lines: CartLine[];
  count: number;
  subtotal: number;
};

export async function getCartDetailed(customerId?: string | null): Promise<CartDetailed> {
  const cart = await findCart(customerId);
  if (!cart) return EMPTY_CART;
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    include: { variant: { include: { product: true } } },
  });

  const promotions = await getActivePromotions();

  const lines: CartLine[] = [];
  for (const it of items) {
    const v = it.variant;
    if (!v || !v.active || !v.product.active) continue;
    const p = v.product;
    const { price, compareAt } = computePrice(p, promotions);
    const unit = v.priceOverride ?? price;
    const images = parseJson<string[]>(p.images, []);
    lines.push({
      itemId: it.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      brand: p.brand,
      name: p.name,
      type: p.type,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      image: images[0] ?? null,
      qty: it.qty,
      unitPrice: unit,
      compareAt: v.priceOverride ? null : compareAt,
      lineTotal: unit * it.qty,
      maxStock: v.stock,
    });
  }

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { id: cart.id, token: cart.token, lines, count, subtotal };
}

export async function addToCart(variantId: string, qty: number, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId);
  const variant = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || !variant.active) throw new Error("Variante indisponível.");
  if (variant.stock <= 0) throw new Error("Produto esgotado.");

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const desired = (existing?.qty ?? 0) + Math.max(1, qty);
  const capped = Math.min(desired, variant.stock);

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { qty: capped } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, variantId, qty: capped } });
  }
}

export async function updateCartQty(variantId: string, qty: number, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId);
  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    include: { variant: true },
  });
  if (!existing) return;
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: existing.id } });
    return;
  }
  const capped = Math.min(qty, existing.variant.stock);
  await db.cartItem.update({ where: { id: existing.id }, data: { qty: capped } });
}

export async function removeFromCart(variantId: string, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId);
  await db.cartItem
    .delete({ where: { cartId_variantId: { cartId: cart.id, variantId } } })
    .catch(() => {});
}

export async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
}

/** On login, fold the guest cart into the customer's most recent cart. */
export async function mergeGuestCart(customerId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({
    where: { token },
    include: { items: true },
  });
  if (!guest) return;

  // Just claim the guest cart for this customer — simplest correct merge.
  await db.cart.update({ where: { id: guest.id }, data: { customerId } });
}
