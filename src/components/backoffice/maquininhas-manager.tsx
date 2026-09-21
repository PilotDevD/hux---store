"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2, CreditCard } from "lucide-react";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { upsertCardMachineAction, deleteCardMachineAction } from "@/app/actions/backoffice-maquininhas";
import type { InstallmentFee } from "@/lib/card-machine-fee";

export type MachineRow = {
  id: string; name: string; provider: string | null;
  debitFee: number; creditFee: number; pixFee: number;
  installmentFees: InstallmentFee[]; notes: string | null; active: boolean;
};

const label = "data-label mb-1.5 block text-muted";
const INSTALLMENTS = Array.from({ length: 11 }, (_, i) => i + 2); // 2x..12x

type FormState = {
  id?: string; name: string; provider: string; debitFee: string; creditFee: string; pixFee: string;
  inst: Record<number, string>; notes: string; active: boolean;
};
const emptyForm = (): FormState => ({ name: "", provider: "", debitFee: "", creditFee: "", pixFee: "", inst: {}, notes: "", active: true });

export function MaquininhasManager({ machines }: { machines: MachineRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [f, setF] = useState<FormState>(emptyForm());
  const set = (k: keyof FormState, v: string | boolean | Record<number, string>) => setF((p) => ({ ...p, [k]: v }));
  const setInst = (n: number, v: string) => setF((p) => ({ ...p, inst: { ...p.inst, [n]: v } }));

  function openNew() { setF(emptyForm()); setOpen(true); }
  function openEdit(m: MachineRow) {
    const inst: Record<number, string> = {};
    for (const fee of m.installmentFees) inst[fee.n] = String(fee.pct).replace(".", ",");
    setF({
      id: m.id, name: m.name, provider: m.provider ?? "",
      debitFee: m.debitFee ? String(m.debitFee).replace(".", ",") : "",
      creditFee: m.creditFee ? String(m.creditFee).replace(".", ",") : "",
      pixFee: m.pixFee ? String(m.pixFee).replace(".", ",") : "",
      inst, notes: m.notes ?? "", active: m.active,
    });
    setOpen(true);
  }

  const num = (s: string) => { const n = Number(String(s).replace(",", ".")); return isNaN(n) ? 0 : n; };

  async function save() {
    if (!f.name.trim()) return toast("Informe o nome da maquininha.", "error");
    setBusy(true);
    const installmentFees = INSTALLMENTS
      .filter((n) => f.inst[n]?.trim())
      .map((n) => ({ n, pct: num(f.inst[n]) }));
    const res = await upsertCardMachineAction({
      id: f.id, name: f.name, provider: f.provider,
      debitFee: num(f.debitFee), creditFee: num(f.creditFee), pixFee: num(f.pixFee),
      installmentFees, notes: f.notes, active: f.active,
    });
    setBusy(false);
    if (res.ok) { toast("Maquininha salva.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta maquininha?")) return;
    setRowBusy(id);
    await deleteCardMachineAction(id);
    setRowBusy(null);
    toast("Maquininha removida.", "success");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova maquininha</button>
      </div>

      {machines.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhuma maquininha" hint="Cadastre suas maquininhas com as taxas de débito, crédito à vista e por parcela. Ao vender no cartão, o sistema mostra o valor líquido." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {machines.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{m.name}</p>
                    {m.active ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>}
                  </div>
                  {m.provider && <p className="text-xs text-muted">{m.provider}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)} className="grid size-8 place-items-center text-faint hover:text-orange"><Pencil size={14} /></button>
                  <button onClick={() => remove(m.id)} disabled={rowBusy === m.id} className="grid size-8 place-items-center text-faint hover:text-negative"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div><p className="font-display text-lg">{m.debitFee}%</p><p className="data-label text-faint">débito</p></div>
                <div><p className="font-display text-lg">{m.creditFee}%</p><p className="data-label text-faint">crédito 1x</p></div>
                <div><p className="font-display text-lg">{m.installmentFees.length}</p><p className="data-label text-faint">parcelas config.</p></div>
              </div>
              {m.installmentFees.length > 0 && (
                <p className="mt-2 line-clamp-2 font-mono text-[0.7rem] text-muted">
                  {m.installmentFees.map((fee) => `${fee.n}x ${fee.pct}%`).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar maquininha" : "Nova maquininha"} wide dismissible={false}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Nome / apelido *</span><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Stone loja" /></label>
            <label><span className={label}>Adquirente</span><input className="field" value={f.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Cielo, Stone, PagBank…" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={label}>Taxa débito (%)</span><input className="field" value={f.debitFee} onChange={(e) => set("debitFee", e.target.value)} placeholder="1,99" inputMode="decimal" /></label>
            <label><span className={label}>Taxa crédito à vista (%)</span><input className="field" value={f.creditFee} onChange={(e) => set("creditFee", e.target.value)} placeholder="3,99" inputMode="decimal" /></label>
            <label><span className={label}>Taxa Pix (%)</span><input className="field" value={f.pixFee} onChange={(e) => set("pixFee", e.target.value)} placeholder="0,00" inputMode="decimal" /></label>
          </div>

          <div>
            <span className={label}>Taxas do crédito parcelado (%)</span>
            <p className="mb-2 text-xs text-faint">Preencha só as parcelas que você usa. Vazio = usa a taxa do crédito à vista.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {INSTALLMENTS.map((n) => (
                <label key={n} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-2 py-1.5">
                  <span className="w-7 shrink-0 font-mono text-xs text-muted">{n}x</span>
                  <input className="w-full bg-transparent text-sm outline-none" value={f.inst[n] ?? ""} onChange={(e) => setInst(n, e.target.value)} placeholder="%" inputMode="decimal" />
                </label>
              ))}
            </div>
          </div>

          <label className="block"><span className={label}>Observações</span><input className="field" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" /> Ativa
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
