import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/conta";
  if (await getCustomer()) redirect(target);

  return (
    <AuthShell title="Crie sua conta" subtitle="Leva menos de um minuto. Bora correr?">
      <RegisterForm next={target} />
    </AuthShell>
  );
}
