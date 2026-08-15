"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Megaphone, Pencil, Trash2, Copy } from "lucide-react";
import { upsertAmbassadorAction, deleteAmbassadorAction } from "@/app/actions/backoffice-embaixadores";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";

export type AmbassadorRow = {
  id: string; name: string; email: string | null; phone: string | null; code: string;
  discountPct: number; cashbackPct: number; active: boolean; notes: string | null;
  uses: number; revenue: number; cashback: number;
};

export function EmbaixadoresManager({ ambassadors }: { ambassadors: AmbassadorRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string | boolean>>({ discountPct: "5", cashbackPct: "5", active: true });
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF({ discountPct: "5", cashbackPct: "5", active: true }); setOpen(true); }
  function openEdit(a: AmbassadorRow) {
    setF({ id: a.id, name: a.name, email: a.email ?? "", phone: a.phone ?? "", code: a.code, discountPct: String(a.discountPct), cashbackPct: String(a.cashbackPct), active: a.active, notes: a.notes ?? "" });
    setOpen(true);
  }
  async function save() {
    if (!f.name || !f.code) return toast("Preencha nome e código do cupom.", "error");
    setBusy(true);
    const res = await upsertAmbassadorAction({
      id: f.id as string | undefined, name: f.name as string, email: f.email as string, phone: f.phone as string,
      code: f.code as string, discountPct: Number(f.discountPct) || 0, cashbackPct: Number(f.cashbackPct) || 0,
      active: !!f.active, notes: f.notes as string,
    });
    setBusy(false);
    if (res.ok) { toast("Embaixador salvo.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function remove(id: string) { setRowBusy(id); await deleteAmbassadorAction(id); setRowBusy(null); toast("Removido.", "success"); router.refresh(); }

  const totalCashback = ambassadors.reduce((s, a) => s + a.cashback, 0);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">Cashback total acumulado: <strong className="text-brand">{formatCents(totalCashback)}</strong></p>
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo embaixador</button>
      </div>

      {ambassadors.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum embaixador" hint="Cadastre embaixadores com cupom próprio e cashback por venda." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ambassadors.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.name}</p>
                    {a.active ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(a.code); toast("Cupom copiado.", "success"); }} className="mt-1 inline-flex items-center gap-1.5 rounded border border-dashed border-orange/50 bg-orange/5 px-2 py-1 font-mono text-xs font-bold text-orange">
                    {a.code} <Copy size={11} />
                  </button>
                  <p className="mt-1 text-xs text-muted">{a.discountPct}% desconto · {a.cashbackPct}% cashback{a.email ? ` · ${a.email}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="grid size-8 place-items-center text-faint hover:text-orange"><Pencil size={14} /></button>
                  <button onClick={() => remove(a.id)} disabled={rowBusy === a.id} className="grid size-8 place-items-center text-faint hover:text-negative"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div><p className="font-display text-xl">{a.uses}</p><p className="data-label text-faint">usos</p></div>
                <div><p className="font-display text-xl">{formatCents(a.revenue)}</p><p className="data-label text-faint">receita</p></div>
                <div><p className="font-display text-xl text-brand">{formatCents(a.cashback)}</p><p className="data-label text-faint">cashback</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar embaixador" : "Novo embaixador"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Nome *</span><input className="field" value={(f.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} /></label>
          <label><span className={label}>Código do cupom *</span><input className="field font-mono uppercase" value={(f.code as string) ?? ""} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="JOAO10" /></label>
          <label><span className={label}>E-mail</span><input className="field" value={(f.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} /></label>
          <label><span className={label}>Telefone</span><input className="field" value={(f.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} /></label>
          <label><span className={label}>Desconto ao cliente (%)</span><input className="field" value={(f.discountPct as string) ?? "5"} onChange={(e) => set("discountPct", e.target.value)} inputMode="numeric" /></label>
          <label><span className={label}>Cashback ao embaixador (%)</span><input className="field" value={(f.cashbackPct as string) ?? "5"} onChange={(e) => set("cashbackPct", e.target.value)} inputMode="decimal" /></label>
          <label className="sm:col-span-2"><span className={label}>Observações</span><input className="field" value={(f.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={!!f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" /> Ativo
          </label>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
