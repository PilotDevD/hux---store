"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const emailSchema = z.string().email("E-mail inválido.");

export async function subscribeNewsletter(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "E-mail inválido." };
  }
  const email = parsed.data;
  const existing = await db.contactMessage.findFirst({
    where: { email, subject: "Newsletter" },
  });
  if (!existing) {
    await db.contactMessage.create({
      data: { name: "Newsletter", email, subject: "Newsletter", message: "Inscrição na newsletter." },
    });
  }
  return { ok: true, message: "Pronto! Você está no pelotão." };
}

const contactSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  subject: z.string().optional(),
  message: z.string().min(5, "Escreva sua mensagem."),
});

export async function sendContactMessage(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Verifique os campos." };
  }
  await db.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || "Contato pelo site",
      message: parsed.data.message,
    },
  });
  return { ok: true, message: "Mensagem enviada! Retornaremos em breve." };
}
