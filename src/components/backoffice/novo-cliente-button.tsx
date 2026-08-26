"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Modal } from "./modal";
import { useToast } from "@/components/ui/toast";
import { upsertCustomerStaffAction } from "@/app/actions/backoffice-clientes";

const label = "data-label mb-1.5 block text-muted";

export function NovoClienteButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", cpf: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (f.name.trim().length < 2) return toast("Informe o nome do cliente.", "error");
    setBusy(true);
    const res = await upsertCustomerStaffAction({ name: f.name, email: f.email || undefined, phone: f.phone || undefined, cpf: f.cpf || undefined });
    setBusy(false);
    if (res.ok) {
      toast("Cliente cadastrado.", "success");
      setOpen(false);
      setF({ name: "", email: "", phone: "", cpf: "" });
      router.refresh();
    } else toast(res.error ?? "Erro.", "error");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary"><UserPlus size={16} /> Novo cliente</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente" dismissible={false}>
        <div className="space-y-4">
          <label className="block"><span className={label}>Nome *</span>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" autoFocus />
          </label>
          <label className="block"><span className={label}>E-mail (opcional)</span>
            <input className="field" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" inputMode="email" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className={label}>Telefone</span>
              <input className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
            </label>
            <label className="block"><span className={label}>CPF (opcional)</span>
              <input className="field" value={f.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Cadastrar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
