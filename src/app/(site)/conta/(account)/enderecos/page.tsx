import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressesManager } from "@/components/account/addresses-manager";

export const metadata: Metadata = { title: "Endereços" };

export default async function AddressesPage() {
  const customer = await requireCustomer();
  const addresses = await db.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Entrega</p>
        <h1 className="headline text-3xl md:text-4xl">Meus endereços</h1>
      </div>
      <AddressesManager
        customerName={customer.name}
        addresses={addresses.map((a) => ({
          id: a.id, label: a.label, recipient: a.recipient, cep: a.cep, street: a.street,
          number: a.number, complement: a.complement, district: a.district, city: a.city,
          state: a.state, isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
