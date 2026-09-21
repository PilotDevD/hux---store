"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const feeSchema = z.object({ n: z.coerce.number().int().min(2).max(24), pct: z.coerce.number().min(0).max(100) });

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da maquininha."),
  provider: z.string().optional(),
  debitFee: z.coerce.number().min(0).max(100).optional(),
  creditFee: z.coerce.number().min(0).max(100).optional(),
  pixFee: z.coerce.number().min(0).max(100).optional(),
  installmentFees: z.array(feeSchema).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

export async function upsertCardMachineAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("maquininhas");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const m = parsed.data;

  // Keep only valid, de-duplicated installment rows, sorted by n.
  const fees = [...new Map((m.installmentFees ?? []).map((f) => [f.n, f.pct])).entries()]
    .map(([n, pct]) => ({ n, pct }))
    .sort((a, b) => a.n - b.n);

  const data = {
    name: m.name.trim(),
    provider: m.provider?.trim() || null,
    debitFee: m.debitFee ?? 0,
    creditFee: m.creditFee ?? 0,
    pixFee: m.pixFee ?? 0,
    installmentFees: JSON.stringify(fees),
    notes: m.notes?.trim() || null,
    active: m.active ?? true,
  };

  if (m.id) await db.cardMachine.update({ where: { id: m.id }, data });
  else await db.cardMachine.create({ data });

  await logAudit({ staff, action: m.id ? "UPDATE" : "CREATE", entity: "Maquininha", entityId: m.id ?? null, summary: `${m.id ? "Editou" : "Cadastrou"} a maquininha ${data.name}` });
  revalidatePath("/backoffice/maquininhas");
  revalidatePath("/backoffice/vendas");
  return { ok: true };
}

export async function deleteCardMachineAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("maquininhas");
  const m = await db.cardMachine.findUnique({ where: { id } });
  await db.cardMachine.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "DELETE", entity: "Maquininha", entityId: id, summary: `Removeu a maquininha ${m?.name ?? id}` });
  revalidatePath("/backoffice/maquininhas");
  revalidatePath("/backoffice/vendas");
  return { ok: true };
}
