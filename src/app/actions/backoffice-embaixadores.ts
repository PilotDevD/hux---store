"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Informe o nome."),
  email: z.string().optional(),
  phone: z.string().optional(),
  code: z.string().min(3, "Informe o código do cupom."),
  discountPct: z.coerce.number().min(0).max(100).optional(), // desconto ao cliente
  cashbackPct: z.coerce.number().min(0).max(100).optional(), // cashback ao embaixador
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function upsertAmbassadorAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireModule("embaixadores");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const a = parsed.data;
  const code = a.code.toUpperCase().replace(/\s+/g, "");
  const discountPct = Math.round(a.discountPct ?? 5);
  const cashbackPct = a.cashbackPct ?? 5;
  const active = a.active ?? true;

  try {
    if (a.id) {
      const amb = await db.ambassador.findUnique({ where: { id: a.id } });
      if (!amb) return { ok: false, error: "Embaixador não encontrado." };
      // update linked coupon (code + discount + active)
      if (amb.couponId) {
        await db.coupon.update({ where: { id: amb.couponId }, data: { code, value: discountPct, active, description: `Cupom do embaixador ${a.name}` } });
      }
      await db.ambassador.update({ where: { id: a.id }, data: { name: a.name, email: a.email || null, phone: a.phone || null, cashbackPct, active, notes: a.notes || null } });
    } else {
      // create coupon + ambassador
      const coupon = await db.coupon.create({
        data: { code, type: "PERCENT", value: discountPct, description: `Cupom do embaixador ${a.name}`, active },
      });
      await db.ambassador.create({
        data: { name: a.name, email: a.email || null, phone: a.phone || null, couponId: coupon.id, cashbackPct, active, notes: a.notes || null },
      });
    }
  } catch {
    return { ok: false, error: "Código de cupom já existe. Escolha outro." };
  }
  await logAudit({ staff, action: a.id ? "UPDATE" : "CREATE", entity: "Embaixador", entityId: a.id ?? null, summary: `${a.id ? "Editou" : "Cadastrou"} embaixador ${a.name} (cupom ${code}, cashback ${cashbackPct}%)` });
  revalidatePath("/backoffice/embaixadores");
  revalidatePath("/backoffice/cupons");
  return { ok: true };
}

export async function deleteAmbassadorAction(id: string): Promise<{ ok: boolean }> {
  const staff = await requireModule("embaixadores");
  const amb = await db.ambassador.findUnique({ where: { id } });
  if (amb?.couponId) await db.coupon.update({ where: { id: amb.couponId }, data: { active: false } }).catch(() => {});
  await db.ambassador.delete({ where: { id } }).catch(() => {});
  await logAudit({ staff, action: "DELETE", entity: "Embaixador", entityId: id, summary: `Removeu embaixador ${amb?.name ?? id}` });
  revalidatePath("/backoffice/embaixadores");
  return { ok: true };
}
