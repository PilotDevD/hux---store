"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword, createStaffSession, destroyStaffSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type FormState = { ok: boolean; error?: string } | null;

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/backoffice") && !n.startsWith("//") ? n : "/backoffice";
}

const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

export async function staffLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  const username = parsed.data.username.toLowerCase().trim();
  const user = await db.user.findFirst({
    where: { username: { equals: username } },
  });
  if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Usuário ou senha incorretos." };
  }

  await createStaffSession(user.id, user.displayName, user.role);
  await logAudit({ staff: { id: user.id, displayName: user.displayName }, action: "LOGIN", entity: "Sessão", summary: `Login no painel (@${user.username})` });
  redirect(safeNext(formData.get("next")));
}

export async function staffLogoutAction() {
  await destroyStaffSession();
  redirect("/backoffice/login");
}
