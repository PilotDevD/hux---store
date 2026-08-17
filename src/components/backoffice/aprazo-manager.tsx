"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, CheckCheck, User, Calendar } from "lucide-react";
import { payAprazoInstallmentAction, settleAprazoAction } from "@/app/actions/backoffice-aprazo";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
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
              return (
                <div key={p.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted">{p.seq}/{o.count}</span>
                  <span className={cn(p.overdue && !paid ? "font-semibold text-negative" : "text-muted")}>
                    vence {formatDate(p.dueDate)}
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
              );
            })}
          </div>

          {!o.fullyPaid && (
            <div className="flex justify-end border-t border-line px-5 py-3">
              <button onClick={() => quitar(o.number)} disabled={pending} className="btn btn-light px-3 py-2 text-xs">
                {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Quitar todas as parcelas
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
