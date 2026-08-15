"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Wallet, Trash2, Check } from "lucide-react";
import { createExpenseAction, toggleExpensePaidAction, deleteExpenseAction } from "@/app/actions/backoffice-despesas";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/enums";

export type ExpenseRow = {
  id: string; name: string; category: string; amount: number; dueDate: string;
  paid: boolean; label: string | null;
};

export function DespesasManager({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState<Record<string, string>>({ category: "OUTROS", type: "UNICA" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";
  const now = new Date();

  async function save() {
    if (!f.name || !f.amount || !f.dueDate) return toast("Preencha nome, valor e vencimento.", "error");
    setBusy(true);
    const res = await createExpenseAction({ name: f.name, category: (f.category || "OUTROS") as never, type: (f.type || "UNICA") as never, amount: f.amount, dueDate: f.dueDate, installments: f.installments ? Number(f.installments) : undefined, notes: f.notes });
    setBusy(false);
    if (res.ok) { toast("Despesa lançada.", "success"); setOpen(false); setF({ category: "OUTROS", type: "UNICA" }); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  function togglePaid(id: string) { start(async () => { await toggleExpensePaidAction(id); router.refresh(); }); }
  function remove(id: string) { start(async () => { await deleteExpenseAction(id); toast("Removida.", "success"); router.refresh(); }); }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary"><Plus size={16} /> Nova despesa</button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma despesa" hint="Lance gastos únicos ou parcelados e acompanhe os vencimentos." />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[auto_1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
            <span>Pago</span><span>Despesa</span><span>Categoria</span><span>Vencimento</span><span>Valor</span><span></span>
          </div>
          <div className="divide-y divide-line">
            {expenses.map((e) => {
              const overdue = !e.paid && new Date(e.dueDate) < now;
              return (
                <div key={e.id} className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-[auto_1.5fr_1fr_1fr_1fr_auto] md:gap-4">
                  <button onClick={() => togglePaid(e.id)} disabled={pending} className={cn("grid size-6 place-items-center rounded border transition-colors", e.paid ? "border-positive bg-positive text-void" : "border-line hover:border-ink")} aria-label="Pago">
                    {e.paid && <Check size={14} />}
                  </button>
                  <span className={cn("truncate text-sm font-medium", e.paid && "text-muted line-through")}>{e.name}{e.label ? <span className="ml-1 text-xs text-faint">{e.label}</span> : null}</span>
                  <span className="hidden text-sm text-muted md:block">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</span>
                  <span className={cn("text-sm", overdue ? "font-semibold text-negative" : "text-muted")}>{formatDate(e.dueDate)}</span>
                  <span className="text-sm font-semibold">{formatCents(e.amount)}</span>
                  <button onClick={() => remove(e.id)} disabled={pending} className="justify-self-end text-faint hover:text-negative"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova despesa" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={label}>Nome *</span><input className="field" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Aluguel da loja" /></label>
          <label><span className={label}>Categoria</span>
            <select className="field" value={f.category ?? "OUTROS"} onChange={(e) => set("category", e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label><span className={label}>Tipo</span>
            <select className="field" value={f.type ?? "UNICA"} onChange={(e) => set("type", e.target.value)}>
              <option value="UNICA">Única</option>
              <option value="PARCELADA">Parcelada</option>
            </select>
          </label>
          <label><span className={label}>{f.type === "PARCELADA" ? "Valor de cada parcela (R$) *" : "Valor (R$) *"}</span>
            <input className="field" value={f.amount ?? ""} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="0,00" />
          </label>
          <label><span className={label}>{f.type === "PARCELADA" ? "1º vencimento *" : "Vencimento *"}</span>
            <input type="date" className="field" value={f.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} />
          </label>
          {f.type === "PARCELADA" && (
            <label><span className={label}>Nº de parcelas *</span><input className="field" value={f.installments ?? ""} onChange={(e) => set("installments", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="6" /></label>
          )}
          <label className="sm:col-span-2"><span className={label}>Observações</span><input className="field" value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Lançar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
