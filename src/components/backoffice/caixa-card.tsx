"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Minus, Loader2, X, Trash2 } from "lucide-react";
import { addCashEntryAction, deleteCashEntryAction } from "@/app/actions/backoffice-caixa";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";

export type CashRow = { id: string; kind: string; amount: number; note: string | null; userName: string | null; createdAt: string };

export function CaixaCard({ balance, entries, cashSalesToday }: { balance: number; entries: CashRow[]; cashSalesToday: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  function openForm(k: "ENTRADA" | "SAIDA") { setKind(k); setAmount(""); setNote(""); setOpen(true); }

  async function save() {
    if (!amount.trim()) return toast("Informe o valor.", "error");
    setBusy(true);
    const res = await addCashEntryAction({ kind, amount, note });
    setBusy(false);
    if (res.ok) { toast("Lançamento registrado.", "success"); setOpen(false); setAmount(""); setNote(""); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function remove(id: string) {
    setRowBusy(id);
    await deleteCashEntryAction(id);
    setRowBusy(null);
    toast("Lançamento removido.", "success");
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-brand" />
          <p className="data-label text-muted">Caixa · dinheiro em espécie</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => openForm("ENTRADA")} className="btn btn-ghost px-2.5 py-1.5 text-xs text-positive"><Plus size={13} /> Entrada</button>
          <button onClick={() => openForm("SAIDA")} className="btn btn-ghost px-2.5 py-1.5 text-xs text-negative"><Minus size={13} /> Saída</button>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="data-label text-muted">Saldo em caixa</p>
        <p className={cn("font-display text-3xl", balance < 0 ? "text-negative" : "text-brand")}>{formatCents(balance)}</p>
        <p className="mt-1 text-xs text-faint">Vendas em dinheiro hoje: {formatCents(cashSalesToday)} — já incluídas no saldo. Use Entrada/Saída para sangria, suprimento e ajustes.</p>
      </div>

      {open && (
        <div className="border-t border-line bg-void px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={cn("text-sm font-semibold", kind === "ENTRADA" ? "text-positive" : "text-negative")}>
              {kind === "ENTRADA" ? "Entrada de dinheiro" : "Saída de dinheiro"}
            </span>
            <button onClick={() => setOpen(false)} className="text-faint hover:text-ink"><X size={15} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="field w-32 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" autoFocus />
            <input className="field min-w-[140px] flex-1 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Descrição (ex.: troco, sangria, suprimento)" />
            <button onClick={save} disabled={busy} className="btn btn-primary px-3 py-2 text-xs">{busy ? <Loader2 size={14} className="animate-spin" /> : null} Lançar</button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="max-h-56 divide-y divide-line overflow-y-auto border-t border-line">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", e.kind === "ENTRADA" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                {e.kind === "ENTRADA" ? <Plus size={13} /> : <Minus size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate">{e.note ?? (e.kind === "ENTRADA" ? "Entrada" : "Saída")}</p>
                <p className="text-xs text-faint">{formatDate(e.createdAt)}{e.userName ? ` · ${e.userName}` : ""}</p>
              </div>
              <span className={cn("shrink-0 font-mono font-semibold", e.kind === "ENTRADA" ? "text-positive" : "text-negative")}>
                {e.kind === "ENTRADA" ? "+" : "−"} {formatCents(e.amount)}
              </span>
              <button onClick={() => remove(e.id)} disabled={rowBusy === e.id} className="shrink-0 text-faint hover:text-negative" aria-label="Remover">
                {rowBusy === e.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
