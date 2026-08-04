"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateSettingsAction } from "@/app/actions/backoffice-admin";
import { useToast } from "@/components/ui/toast";

export function SettingsForm({
  initial,
}: {
  initial: { freeShippingThreshold: string; supportEmail: string; supportPhone: string; pixKey: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  async function save() {
    setSaving(true);
    await updateSettingsAction({
      freeShippingThreshold: f.freeShippingThreshold,
      supportEmail: f.supportEmail,
      supportPhone: f.supportPhone,
      pixKey: f.pixKey,
    });
    setSaving(false);
    toast("Configurações salvas.", "success");
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="headline text-xl">Configurações da loja</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Frete grátis a partir de (R$)</span>
          <input className="field" value={f.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", e.target.value)} placeholder="299,00" inputMode="decimal" />
        </label>
        <label><span className={label}>Chave Pix (recebimento)</span>
          <input className="field" value={f.pixKey} onChange={(e) => set("pixKey", e.target.value)} placeholder="contato@hux.com.br" />
        </label>
        <label><span className={label}>E-mail de suporte</span>
          <input className="field" value={f.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </label>
        <label><span className={label}>WhatsApp de suporte</span>
          <input className="field" value={f.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-faint">
        A chave Pix aqui é informativa. O código Pix gerado no checkout usa a variável <code className="text-muted">PIX_KEY</code> do ambiente.
      </p>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
        </button>
      </div>
    </div>
  );
}
