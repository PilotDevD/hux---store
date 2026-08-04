import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { Logo } from "@/components/site/logo";
import { StaffLoginForm } from "@/components/backoffice/staff-login-form";

export const metadata: Metadata = { title: "Gestão HUX", robots: { index: false } };

export default async function BackofficeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/backoffice") ? next : "/backoffice";
  if (await getStaff()) redirect(target);

  return (
    <div className="grid min-h-screen place-items-center bg-graphite px-5">
      <div className="tech-grid pointer-events-none fixed inset-0 opacity-30" />
      <div className="glow-orange pointer-events-none fixed -top-20 right-1/4 h-96 w-96 opacity-50" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-6 scale-125" />
          <p className="eyebrow">Painel de gestão</p>
          <h1 className="headline mt-2 text-3xl">Backoffice</h1>
        </div>
        <div className="card p-7">
          <StaffLoginForm next={target} />
        </div>
        <p className="mt-6 text-center font-mono text-xs text-faint">
          HUX RUN · acesso restrito à equipe
        </p>
      </div>
    </div>
  );
}
