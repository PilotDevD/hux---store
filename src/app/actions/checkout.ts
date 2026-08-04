"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";
import { getCartDetailed } from "@/lib/cart";
import { computeShipping, type ShippingQuote } from "@/lib/shipping";
import { validateCoupon } from "@/lib/coupon";
import { createOrder } from "@/lib/orders";
import { onlyDigits } from "@/lib/utils";
import { UFS } from "@/lib/enums";

// ------------------------------- ViaCEP ------------------------------------

export type CepResult =
  | { ok: true; cep: string; street: string; district: string; city: string; state: string; complement: string }
  | { ok: false; error: string };

export async function lookupCepAction(rawCep: string): Promise<CepResult> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) return { ok: false, error: "CEP deve ter 8 dígitos." };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "Não foi possível consultar o CEP." };
    const data = await res.json();
    if (data.erro) return { ok: false, error: "CEP não encontrado." };
    return {
      ok: true,
      cep,
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
      complement: data.complemento ?? "",
    };
  } catch {
    return { ok: false, error: "Falha ao consultar o CEP. Preencha manualmente." };
  }
}

// ----------------------- Public shipping quote (CEP) -----------------------

export type CepQuote =
  | { ok: true; city: string; state: string; quote: ShippingQuote }
  | { ok: false; error: string };

/**
 * Public shipping quote by CEP — used by the "calcule o frete" box on product
 * and cart pages. Resolves the CEP to a UF via ViaCEP, then applies the store's
 * shipping rules. `subtotalCents` lets the free-shipping threshold apply.
 */
export async function quoteShippingByCepAction(
  rawCep: string,
  subtotalCents = 0,
): Promise<CepQuote> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) return { ok: false, error: "Informe um CEP válido (8 dígitos)." };

  const addr = await lookupCepAction(cep);
  if (!addr.ok) return { ok: false, error: addr.error };

  const quote = await computeShipping(addr.state, subtotalCents);
  if (!quote) return { ok: false, error: "Ainda não entregamos para essa região." };

  return { ok: true, city: addr.city, state: addr.state, quote };
}

// --------------------------- Checkout summary ------------------------------

export type CheckoutSummary = {
  empty: boolean;
  count: number;
  subtotal: number;
  shipping: ShippingQuote | null;
  discountTotal: number;
  freeShipping: boolean;
  couponCode: string | null;
  couponError: string | null;
  couponDescription: string | null;
  total: number;
};

export async function getCheckoutSummary(
  addressId: string | null,
  couponCode: string | null,
): Promise<CheckoutSummary> {
  const customer = await requireCustomer();
  const cart = await getCartDetailed(customer.id);

  if (cart.count === 0) {
    return {
      empty: true, count: 0, subtotal: 0, shipping: null, discountTotal: 0,
      freeShipping: false, couponCode: null, couponError: null, couponDescription: null, total: 0,
    };
  }

  let shipping: ShippingQuote | null = null;
  if (addressId) {
    const address = await db.address.findFirst({ where: { id: addressId, customerId: customer.id } });
    if (address) shipping = await computeShipping(address.state, cart.subtotal);
  }

  let discountTotal = 0;
  let freeShipping = false;
  let couponError: string | null = null;
  let couponDescription: string | null = null;
  let appliedCode: string | null = null;

  if (couponCode) {
    const res = await validateCoupon(couponCode, cart.subtotal, customer.id);
    if (res.ok) {
      discountTotal = res.discountCents ?? 0;
      freeShipping = !!res.freeShipping;
      couponDescription = res.description ?? null;
      appliedCode = res.code ?? null;
    } else {
      couponError = res.error ?? "Cupom inválido.";
    }
  }

  const shippingCost = shipping ? (freeShipping ? 0 : shipping.price) : 0;
  const total = Math.max(0, cart.subtotal - discountTotal) + shippingCost;

  return {
    empty: false,
    count: cart.count,
    subtotal: cart.subtotal,
    shipping,
    discountTotal,
    freeShipping,
    couponCode: appliedCode,
    couponError,
    couponDescription,
    total,
  };
}

// ------------------------------ Addresses ----------------------------------

const addressSchema = z.object({
  label: z.string().optional(),
  recipient: z.string().min(2, "Informe o destinatário."),
  cep: z.string().transform(onlyDigits).refine((v) => v.length === 8, "CEP inválido."),
  street: z.string().min(2, "Informe a rua."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  district: z.string().min(1, "Informe o bairro."),
  city: z.string().min(1, "Informe a cidade."),
  state: z.string().refine((v) => (UFS as readonly string[]).includes(v.toUpperCase()), "UF inválida."),
});

export async function addAddressAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; addressId?: string }> {
  const customer = await requireCustomer();
  const parsed = addressSchema.safeParse({
    label: formData.get("label"),
    recipient: formData.get("recipient"),
    cep: formData.get("cep"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    district: formData.get("district"),
    city: formData.get("city"),
    state: formData.get("state"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };
  }

  const existing = await db.address.count({ where: { customerId: customer.id } });
  const address = await db.address.create({
    data: {
      customerId: customer.id,
      label: parsed.data.label || "Endereço",
      recipient: parsed.data.recipient,
      cep: parsed.data.cep,
      street: parsed.data.street,
      number: parsed.data.number,
      complement: parsed.data.complement || null,
      district: parsed.data.district,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      isDefault: existing === 0,
    },
  });
  revalidatePath("/checkout");
  revalidatePath("/conta/enderecos");
  return { ok: true, addressId: address.id };
}

export async function deleteAddressAction(addressId: string): Promise<{ ok: boolean }> {
  const customer = await requireCustomer();
  await db.address.deleteMany({ where: { id: addressId, customerId: customer.id } });
  revalidatePath("/conta/enderecos");
  return { ok: true };
}

// ------------------------------ Place order --------------------------------

export async function placeOrderAction(input: {
  addressId: string;
  couponCode?: string | null;
  note?: string | null;
  paymentMethod?: "PIX_MANUAL" | "BOLETO";
  boletoParcelas?: number;
}): Promise<{ ok: boolean; error?: string; number?: string }> {
  const customer = await requireCustomer();
  const res = await createOrder(customer.id, input);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/conta/pedidos");
  return { ok: true, number: res.number };
}
