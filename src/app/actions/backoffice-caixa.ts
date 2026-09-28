"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseReaisToCents, formatCents } from "@/lib/money";

const schema = z.object({
  kind: z.enum(["ENTRADA", "SAIDA"]),
  amount: z.string().min(1, "Informe o valor."),
  note: z.string().optional(),
});

export async function addCashEntryAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("dashboard");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const amount = parseReaisToCents(parsed.data.amount);
  if (amount <= 0) return { ok: false, error: "Informe um valor maior que zero." };

  await db.cashEntry.create({
    data: { kind: parsed.data.kind, amount, note: parsed.data.note?.trim() || null, userId: staff.id, userName: staff.displayName },
  });
  await logAudit({
    staff, action: "CASH", entity: "Caixa", summary:
      `${parsed.data.kind === "ENTRADA" ? "Entrada" : "Saída"} de ${formatCents(amount)} no caixa${parsed.data.note ? ` (${parsed.data.note})` : ""}`,
  });
  revalidatePath("/backoffice");
  return { ok: true };
}

export async function deleteCashEntryAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("dashboard");
  await db.cashEntry.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "CASH", entity: "Caixa", entityId: id, summary: "Removeu um lançamento de caixa" });
  revalidatePath("/backoffice");
  return { ok: true };
}
