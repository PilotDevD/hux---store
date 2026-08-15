"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseReaisToCents } from "@/lib/money";
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from "@/lib/enums";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da despesa."),
  category: z.enum(EXPENSE_CATEGORIES),
  type: z.enum(EXPENSE_TYPES),
  amount: z.string(),
  dueDate: z.string().min(1, "Informe o vencimento."),
  installments: z.coerce.number().int().min(1).max(60).optional(),
  notes: z.string().optional(),
});

export async function createExpenseAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("despesas");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const e = parsed.data;
  const amount = parseReaisToCents(e.amount);
  const first = new Date(e.dueDate);

  if (e.type === "PARCELADA") {
    const n = Math.max(1, e.installments ?? 1);
    const rows = Array.from({ length: n }, (_, i) => {
      const due = new Date(first);
      due.setMonth(due.getMonth() + i);
      return { name: e.name, category: e.category, amount, dueDate: due, label: `${i + 1}/${n}`, notes: e.notes || null };
    });
    await db.expense.createMany({ data: rows });
  } else {
    await db.expense.create({ data: { name: e.name, category: e.category, amount, dueDate: first, notes: e.notes || null } });
  }
  await logAudit({ staff, action: "CREATE", entity: "Despesa", summary: `Lançou despesa "${e.name}" (${e.type === "PARCELADA" ? `${e.installments}x` : "única"})` });
  revalidatePath("/backoffice/despesas");
  return { ok: true };
}

export async function toggleExpensePaidAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("despesas");
  const exp = await db.expense.findUnique({ where: { id } });
  if (!exp) return { ok: false };
  const paid = !exp.paid;
  await db.expense.update({ where: { id }, data: { paid, paidAt: paid ? new Date() : null } });
  await logAudit({ staff, action: "PAYMENT", entity: "Despesa", entityId: id, summary: `${paid ? "Baixou" : "Reabriu"} a despesa "${exp.name}"${exp.label ? ` ${exp.label}` : ""}` });
  revalidatePath("/backoffice/despesas");
  revalidatePath("/backoffice");
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("despesas");
  const exp = await db.expense.findUnique({ where: { id } });
  await db.expense.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "DELETE", entity: "Despesa", entityId: id, summary: `Removeu a despesa "${exp?.name ?? id}"` });
  revalidatePath("/backoffice/despesas");
  return { ok: true };
}
