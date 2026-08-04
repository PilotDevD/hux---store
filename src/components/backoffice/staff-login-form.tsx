"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { staffLoginAction } from "@/app/actions/staff-auth";
import { SubmitButton } from "@/components/ui/button";

export function StaffLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(staffLoginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-negative/40 bg-negative/10 px-3 py-2.5 text-sm text-negative">
          <AlertTriangle size={16} className="shrink-0" />
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Usuário</span>
        <input name="username" required autoComplete="username" className="field" placeholder="admin" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Senha</span>
        <input type="password" name="password" required autoComplete="current-password" className="field" placeholder="••••••••" />
      </label>
      <SubmitButton className="w-full" pendingLabel="Entrando…">Acessar painel</SubmitButton>
    </form>
  );
}
