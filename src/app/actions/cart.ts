"use server";

import { getCustomer } from "@/lib/auth";
import {
  addToCart,
  getCartDetailed,
  removeFromCart,
  updateCartQty,
  type CartDetailed,
} from "@/lib/cart";

async function customerId() {
  return (await getCustomer())?.id ?? null;
}

export async function fetchCartAction(): Promise<CartDetailed> {
  return getCartDetailed(await customerId());
}

export async function addItemAction(
  variantId: string,
  qty = 1,
): Promise<{ ok: boolean; error?: string; cart?: CartDetailed }> {
  try {
    const cid = await customerId();
    await addToCart(variantId, qty, cid);
    return { ok: true, cart: await getCartDetailed(cid) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao adicionar." };
  }
}

export async function updateItemAction(variantId: string, qty: number): Promise<CartDetailed> {
  const cid = await customerId();
  await updateCartQty(variantId, qty, cid);
  return getCartDetailed(cid);
}

export async function removeItemAction(variantId: string): Promise<CartDetailed> {
  const cid = await customerId();
  await removeFromCart(variantId, cid);
  return getCartDetailed(cid);
}
