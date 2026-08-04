"use client";

import { useActionState, useEffect } from "react";
import { updateProfileAction, changePasswordAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const { toast } = useToast();
  useEffect(() => {
    if (state?.ok) toast("Perfil atualizado.", "success");
    else if (state?.error) toast(state.error, "error");
  }, [state, toast]);

  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="headline text-xl">Dados pessoais</h2>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Nome</span>
        <input name="name" defaultValue={name} required className="field" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">E-mail</span>
        <input value={email} disabled className="field opacity-60" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Telefone</span>
        <input name="phone" defaultValue={phone} className="field" placeholder="(11) 99999-9999" />
      </label>
      <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const { toast } = useToast();
  useEffect(() => {
    if (state?.ok) toast("Senha alterada com sucesso.", "success");
    else if (state?.error) toast(state.error, "error");
  }, [state, toast]);

  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="headline text-xl">Segurança</h2>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Senha atual</span>
        <input type="password" name="current" required autoComplete="current-password" className="field" />
      </label>
      <label className="block">
        <span className="data-label mb-1.5 block text-muted">Nova senha</span>
        <input type="password" name="next" required minLength={6} autoComplete="new-password" className="field" />
      </label>
      <SubmitButton variant="ghost" pendingLabel="Alterando…">Alterar senha</SubmitButton>
    </form>
  );
}
