import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getCustomer } from "@/lib/auth";
import { getCartDetailed } from "@/lib/cart";
import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/conta/login?next=/checkout");

  const cart = await getCartDetailed(customer.id);

  if (cart.count === 0) {
    return (
      <div className="container-hux flex flex-col items-center justify-center gap-5 py-32 text-center">
        <div className="grid size-16 place-items-center rounded-full border border-line">
          <ShoppingBag size={26} className="text-faint" />
        </div>
        <h1 className="headline text-3xl">Sua sacola está vazia</h1>
        <p className="max-w-sm text-muted">Adicione peças à sacola antes de finalizar a compra.</p>
        <Link href="/loja" className="btn btn-primary mt-2">Ir para a loja</Link>
      </div>
    );
  }

  const addresses = await db.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <CheckoutClient
      customer={{ name: customer.name, email: customer.email, phone: customer.phone }}
      cart={cart}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipient: a.recipient,
        cep: a.cep,
        street: a.street,
        number: a.number,
        complement: a.complement,
        district: a.district,
        city: a.city,
        state: a.state,
        isDefault: a.isDefault,
      }))}
    />
  );
}
