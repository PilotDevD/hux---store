"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";

export async function setDefaultAddressAction(addressId: string): Promise<{ ok: boolean }> {
  const customer = await requireCustomer();
  const address = await db.address.findFirst({ where: { id: addressId, customerId: customer.id } });
  if (!address) return { ok: false };
  await db.$transaction([
    db.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);
  revalidatePath("/conta/enderecos");
  return { ok: true };
}

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const customer = await requireCustomer();
  await db.notification.updateMany({
    where: { id, customerId: customer.id },
    data: { read: true },
  });
  revalidatePath("/conta/notificacoes");
  revalidatePath("/conta");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const customer = await requireCustomer();
  await db.notification.updateMany({
    where: { customerId: customer.id, read: false },
    data: { read: true },
  });
  revalidatePath("/conta/notificacoes");
  revalidatePath("/conta");
  return { ok: true };
}
