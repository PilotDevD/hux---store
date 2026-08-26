"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { onlyDigits } from "@/lib/utils";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Informe o nome do cliente."),
  email: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
});

/** Staff creates/edits a customer (walk-in / manual). E-mail is optional. */
export async function upsertCustomerStaffAction(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const staff = await requireModule("clientes");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const c = parsed.data;
  const name = c.name.trim();
  const email = c.email?.trim().toLowerCase() || null;
  const phone = c.phone?.trim() ? onlyDigits(c.phone) : null;

  // Guard duplicate e-mail.
  if (email) {
    const clash = await db.customer.findUnique({ where: { email } });
    if (clash && clash.id !== c.id) return { ok: false, error: "Já existe um cliente com este e-mail." };
  }

  try {
    if (c.id) {
      await db.customer.update({ where: { id: c.id }, data: { name, email, phone, cpf: c.cpf?.trim() || null } });
      await logAudit({ staff, action: "UPDATE", entity: "Cliente", entityId: c.id, summary: `Editou o cliente ${name}` });
      revalidatePath(`/backoffice/clientes/${c.id}`);
      revalidatePath("/backoffice/clientes");
      return { ok: true, id: c.id };
    }
    const created = await db.customer.create({
      data: { name, email, phone, cpf: c.cpf?.trim() || null, origin: "BALCAO" },
    });
    await logAudit({ staff, action: "CREATE", entity: "Cliente", entityId: created.id, summary: `Cadastrou o cliente ${name}` });
    revalidatePath("/backoffice/clientes");
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao salvar o cliente." };
  }
}
