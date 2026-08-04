"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createCustomerSession,
  destroyCustomerSession,
  requireCustomer,
} from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";
import { onlyDigits } from "@/lib/utils";

type FormState = { ok: boolean; error?: string } | null;

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  // Only allow internal paths.
  return n.startsWith("/") && !n.startsWith("//") ? n : "/conta";
}

const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
  phone: z.string().optional(),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await db.customer.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "Este e-mail já está cadastrado. Faça login." };

  const customer = await db.customer.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash: await hashPassword(parsed.data.password),
      phone: parsed.data.phone ? onlyDigits(parsed.data.phone) : null,
    },
  });

  await db.notification.create({
    data: {
      customerId: customer.id,
      type: "SISTEMA",
      title: `Bem-vindo à HUX, ${customer.name.split(" ")[0]}!`,
      body: "Sua conta está pronta. Explore os lançamentos e monte seu kit de corrida.",
      link: "/loja",
    },
  });

  await createCustomerSession(customer.id, customer.name);
  await mergeGuestCart(customer.id);
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  const email = parsed.data.email.toLowerCase().trim();
  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || !customer.active || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  await createCustomerSession(customer.id, customer.name);
  await mergeGuestCart(customer.id);
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function logoutCustomerAction() {
  await destroyCustomerSession();
  revalidatePath("/", "layout");
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  phone: z.string().optional(),
});

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireCustomer();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  await db.customer.update({
    where: { id: customer.id },
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone ? onlyDigits(parsed.data.phone) : null,
    },
  });
  revalidatePath("/conta");
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z.string().min(6, "A nova senha deve ter ao menos 6 caracteres."),
  });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const customer = await requireCustomer();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  const record = await db.customer.findUnique({ where: { id: customer.id } });
  if (!record || !(await verifyPassword(parsed.data.current, record.passwordHash))) {
    return { ok: false, error: "Senha atual incorreta." };
  }
  await db.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  return { ok: true };
}
