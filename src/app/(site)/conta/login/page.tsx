import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/conta";
  if (await getCustomer()) redirect(target);

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre para acompanhar seus pedidos e drops.">
      <LoginForm next={target} />
    </AuthShell>
  );
}
