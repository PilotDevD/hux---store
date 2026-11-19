"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, CheckCheck, User, Calendar, Pencil, HandCoins, X } from "lucide-react";
import { payAprazoInstallmentAction, settleAprazoAction, updateInstallmentDueDateAction, registerAprazoPaymentAction } from "@/app/actions/backoffice-aprazo";
import { formatCents } from "@/lib/money";
import { formatDate, toDateInput, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export type AprazoInstallment = { id: string; seq: number; amount: number; dueDate: string; status: string; overdue: boolean };
export type AprazoOrder = {
  number: string; customerName: string; sellerName: string; createdAt: string;
  total: number; downPayment: number; received: number; balance: number;
  count: number; paidCount: number; overdueCount: number;
  nextDue: string | null; fullyPaid: boolean;
  installments: AprazoInstallment[];
};

export function AprazoManager({ orders }: { orders: AprazoOrder[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [editDue, setEditDue] = useState<string | null>(null); // installment id
  const [dueVal, setDueVal] = useState("");
  const [ccOrder, setCcOrder] = useState<string | null>(null); // order number
  const [ccVal, setCcVal] = useState("");
  const [ccMethod, setCcMethod] = useState("DINHEIRO");

  function baixa(id: string) {
    start(async () => {
      const res = await payAprazoInstallmentAction(id);
      if (res.ok) { toast("Parcela recebida.", "success"); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }
  function quitar(number: string) {
    start(async () => {
      const res = await settleAprazoAction(number);
      if (res.ok) { toast("Venda quitada.", "success"); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }
  function openEditDue(id: string, dueDate: string) { setEditDue(id); setDueVal(toDateInput(dueDate)); }
  function salvarVencimento(id: string) {
    if (!dueVal) return toast("Informe a data.", "error");
    start(async () => {
      const res = await updateInstallmentDueDateAction(id, dueVal);
      if (res.ok) { toast("Vencimento alterado.", "success"); setEditDue(null); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }
  function openCc(number: string) { setCcOrder(number); setCcVal(""); setCcMethod("DINHEIRO"); }
  function receberCc(number: string) {
    if (!ccVal.trim()) return toast("Informe o valor recebido.", "error");
    start(async () => {
      const res = await registerAprazoPaymentAction(number, ccVal, ccMethod);
      if (res.ok) {
        toast(res.remaining && res.remaining > 0 ? `Recebido. Saldo restante ${formatCents(res.remaining)}.` : "Recebido — dívida quitada.", "success");
        setCcOrder(null); router.refresh();
      } else toast(res.error ?? "Erro.", "error");
    });
  }

  if (orders.length === 0) {
    return (
      <div className="card p-12 text-center text-sm text-muted">
        Nenhuma venda a prazo registrada. Use <strong>Vendas → Nova venda física</strong> e escolha a forma de pagamento
        <strong> &quot;A prazo (crediário)&quot;</strong> para lançar entrada + parcelas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.number} className={cn("card overflow-hidden", o.overdueCount > 0 && "border-negative/40")}>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/backoffice/pedidos/${o.number}`} className="font-mono text-sm font-semibold hover:text-orange">{o.number}</Link>
                {o.fullyPaid ? (
                  <span className="rounded-full border border-positive/40 bg-positive/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase text-positive">Quitado</span>
                ) : o.overdueCount > 0 ? (
                  <span className="rounded-full border border-negative/40 bg-negative/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase text-negative">{o.overdueCount} vencida(s)</span>
                ) : (
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase text-warning">Em dia</span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><User size={12} /> {o.customerName}</span>
                <span>Vendedor: {o.sellerName}</span>
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatDate(o.createdAt)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCents(o.total)}</p>
              <p className="font-mono text-xs text-muted">{o.paidCount}/{o.count} parcelas</p>
            </div>
          </div>

          {/* Financial summary */}
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              { l: "Entrada", v: formatCents(o.downPayment) },
              { l: "Recebido (parcelas)", v: formatCents(o.received) },
              { l: "A receber", v: formatCents(o.balance), tone: o.balance > 0 },
              { l: "Próx. vencimento", v: o.nextDue ? formatDate(o.nextDue) : "—" },
            ].map((x) => (
              <div key={x.l} className="bg-void px-4 py-2.5">
                <p className="data-label text-faint">{x.l}</p>
                <p className={cn("text-sm font-semibold", x.tone && "text-warning")}>{x.v}</p>
              </div>
            ))}
          </div>

          {/* Parcelas */}
          <div className="divide-y divide-line">
            {o.installments.map((p) => {
              const paid = p.status === "PAGO";
              const editing = editDue === p.id;
              return (
                <div key={p.id} className="px-5 py-2.5 text-sm">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
                    <span className="font-mono text-xs text-muted">{p.seq}/{o.count}</span>
                    <span className={cn("inline-flex items-center gap-1.5", p.overdue && !paid ? "font-semibold text-negative" : "text-muted")}>
                      vence {formatDate(p.dueDate)}
                      {!paid && (
                        <button onClick={() => (editing ? setEditDue(null) : openEditDue(p.id, p.dueDate))} className="text-faint hover:text-brand" aria-label="Alterar vencimento" title="Alterar vencimento">
                          <Pencil size={12} />
                        </button>
                      )}
                    </span>
                    <span className="font-semibold">{formatCents(p.amount)}</span>
                    {paid ? (
                      <span className="inline-flex items-center gap-1 justify-self-end text-xs text-positive"><Check size={13} /> Pago</span>
                    ) : (
                      <button onClick={() => baixa(p.id)} disabled={pending} className="btn btn-ghost justify-self-end px-3 py-1.5 text-xs">
                        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Receber
                      </button>
                    )}
                  </div>
                  {editing && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                      <span className="text-xs text-faint">Novo vencimento:</span>
                      <input type="date" className="field w-40 py-1.5 text-xs" value={dueVal} onChange={(e) => setDueVal(e.target.value)} />
                      <button onClick={() => salvarVencimento(p.id)} disabled={pending} className="btn btn-primary px-3 py-1.5 text-xs">
                        {pending ? <Loader2 size={13} className="animate-spin" /> : null} Salvar
                      </button>
                      <button onClick={() => setEditDue(null)} className="text-faint hover:text-ink"><X size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!o.fullyPaid && (
            <div className="border-t border-line px-5 py-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => (ccOrder === o.number ? setCcOrder(null) : openCc(o.number))} disabled={pending} className="btn btn-ghost px-3 py-2 text-xs">
                  <HandCoins size={14} /> Receber valor (conta corrente)
                </button>
                <button onClick={() => quitar(o.number)} disabled={pending} className="btn btn-light px-3 py-2 text-xs">
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Quitar todas as parcelas
                </button>
              </div>
              {ccOrder === o.number && (
                <div className="mt-3 rounded-lg border border-line bg-void p-3">
                  <p className="mb-2 text-xs text-muted">Receber um valor parcial abatendo a dívida (saldo atual <strong className="text-warning">{formatCents(o.balance)}</strong>). As parcelas mais antigas são quitadas primeiro.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input className="field w-28 py-2 text-sm" value={ccVal} onChange={(e) => setCcVal(e.target.value)} placeholder="0,00" inputMode="decimal" autoFocus />
                    <select className="field w-36 py-2 text-sm" value={ccMethod} onChange={(e) => setCcMethod(e.target.value)}>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="DEBITO">Cartão débito</option>
                      <option value="CREDITO">Cartão crédito</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                    </select>
                    <button onClick={() => receberCc(o.number)} disabled={pending} className="btn btn-primary px-3 py-2 text-xs">
                      {pending ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />} Registrar recebimento
                    </button>
                    <button onClick={() => setCcOrder(null)} className="text-faint hover:text-ink"><X size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
