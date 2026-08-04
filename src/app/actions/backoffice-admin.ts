"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModule, hashPassword } from "@/lib/auth";
import { parseReaisToCents } from "@/lib/money";
import {
  NOTIFICATION_TYPES, ROLES, UFS,
} from "@/lib/enums";

// -------------------------- notifications ----------------------------------

const notifSchema = z.object({
  title: z.string().min(2, "Informe um título."),
  body: z.string().min(2, "Informe a mensagem."),
  type: z.enum(NOTIFICATION_TYPES),
  link: z.string().optional(),
  target: z.string(), // "ALL" or a customerId
});

export async function sendNotificationAction(
  input: z.input<typeof notifSchema>,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  await requireModule("notificacoes");
  const parsed = notifSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const n = parsed.data;

  const customers =
    n.target === "ALL"
      ? await db.customer.findMany({ where: { active: true }, select: { id: true } })
      : await db.customer.findMany({ where: { id: n.target }, select: { id: true } });

  if (customers.length === 0) return { ok: false, error: "Nenhum destinatário encontrado." };

  await db.notification.createMany({
    data: customers.map((c) => ({
      customerId: c.id, type: n.type, title: n.title, body: n.body, link: n.link || null,
    })),
  });
  revalidatePath("/backoffice/notificacoes");
  return { ok: true, count: customers.length };
}

// --------------------------- shipping rules --------------------------------

const shippingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  matchType: z.enum(["ALL", "UF"]),
  ufList: z.array(z.enum(UFS)).optional(),
  price: z.string(),
  freeAbove: z.string().optional(),
  etaDays: z.coerce.number().int().min(1),
  priority: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function upsertShippingRuleAction(input: z.input<typeof shippingSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireModule("frete");
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const s = parsed.data;

  const data = {
    name: s.name, matchType: s.matchType,
    ufList: JSON.stringify(s.matchType === "UF" ? s.ufList ?? [] : []),
    price: parseReaisToCents(s.price),
    freeAbove: s.freeAbove ? parseReaisToCents(s.freeAbove) : null,
    etaDays: s.etaDays, priority: s.priority ?? 0, active: s.active ?? true,
  };
  if (s.id) await db.shippingRule.update({ where: { id: s.id }, data });
  else await db.shippingRule.create({ data });
  revalidatePath("/backoffice/frete");
  return { ok: true };
}

export async function deleteShippingRuleAction(id: string) {
  await requireModule("frete");
  await db.shippingRule.delete({ where: { id } }).catch(() => {});
  revalidatePath("/backoffice/frete");
  return { ok: true };
}

// ------------------------------- users -------------------------------------

const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3),
  displayName: z.string().min(2),
  role: z.enum(ROLES),
  password: z.string().optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function upsertUserAction(input: z.input<typeof userSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireModule("config");
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  const u = parsed.data;
  const username = u.username.toLowerCase().trim();

  const base = {
    username, displayName: u.displayName, role: u.role,
    commissionPct: u.role === "VENDEDOR" ? u.commissionPct ?? 0 : 0,
    permissions: JSON.stringify(u.role === "VENDEDOR" ? u.permissions ?? [] : []),
  };

  try {
    if (u.id) {
      const data: Record<string, unknown> = { ...base };
      if (u.password) data.passwordHash = await hashPassword(u.password);
      await db.user.update({ where: { id: u.id }, data });
    } else {
      if (!u.password || u.password.length < 6) return { ok: false, error: "Senha mínima de 6 caracteres." };
      await db.user.create({ data: { ...base, passwordHash: await hashPassword(u.password) } });
    }
  } catch {
    return { ok: false, error: "Nome de usuário já existe." };
  }
  revalidatePath("/backoffice/config");
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireModule("config");
  const admins = await db.user.count({ where: { role: "ADMIN", active: true } });
  const target = await db.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN" && admins <= 1) {
    return { ok: false, error: "Não é possível remover o único administrador." };
  }
  await db.user.delete({ where: { id } }).catch(() => {});
  revalidatePath("/backoffice/config");
  return { ok: true };
}

// ------------------------------ settings -----------------------------------

export async function updateSettingsAction(input: {
  freeShippingThreshold?: string;
  supportEmail?: string;
  supportPhone?: string;
  pixKey?: string;
}): Promise<{ ok: boolean }> {
  await requireModule("config");
  const current = await db.setting.findUnique({ where: { key: "store" } });
  let value: Record<string, unknown> = {};
  try { value = current ? JSON.parse(current.value) : {}; } catch { value = {}; }

  if (input.freeShippingThreshold !== undefined) value.freeShippingThreshold = parseReaisToCents(input.freeShippingThreshold);
  if (input.supportEmail !== undefined) value.supportEmail = input.supportEmail;
  if (input.supportPhone !== undefined) value.supportPhone = input.supportPhone;
  if (input.pixKey !== undefined) value.pixKey = input.pixKey;

  await db.setting.upsert({
    where: { key: "store" },
    create: { key: "store", value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
  revalidatePath("/backoffice/config");
  return { ok: true };
}
