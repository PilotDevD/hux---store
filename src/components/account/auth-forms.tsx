"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/button";

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius)] border border-negative/40 bg-negative/10 px-3 py-2.5 text-sm text-negative">
      <AlertTriangle size={16} className="shrink-0" />
      {message}
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ErrorBox message={state?.error} />
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">E-mail</span>
        <input type="email" name="email" required autoComplete="email" className="field" placeholder="voce@email.com" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Senha</span>
        <input type="password" name="password" required autoComplete="current-password" className="field" placeholder="••••••••" />
      </label>
      <SubmitButton className="w-full" pendingLabel="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href={`/conta/cadastro${next !== "/conta" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-orange hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ErrorBox message={state?.error} />
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Nome completo</span>
        <input type="text" name="name" required autoComplete="name" className="field" placeholder="Seu nome" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">E-mail</span>
        <input type="email" name="email" required autoComplete="email" className="field" placeholder="voce@email.com" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Telefone (WhatsApp)</span>
        <input type="tel" name="phone" autoComplete="tel" className="field" placeholder="(11) 99999-9999" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Senha</span>
        <input type="password" name="password" required minLength={6} autoComplete="new-password" className="field" placeholder="Mínimo 6 caracteres" />
      </label>
      <SubmitButton className="w-full" pendingLabel="Criando conta…">Criar conta</SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href={`/conta/login${next !== "/conta" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-orange hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
