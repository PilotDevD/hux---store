"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { payInstallmentAction } from "@/app/actions/backoffice-boletos";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type BoletoRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  seq: number;
  total: number; // total parcelas
  amount: number;
  dueDate: string;
  status: string;
  overdue: boolean;
};

export function BoletosTable({ rows }: { rows: BoletoRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  function baixa(id: string) {
    start(async () => {
      const res = await payInstallmentAction(id);
      if (res.ok) {
        toast("Baixa registrada. Boleto pago.", "success");
        router.refresh();
      } else toast(res.error ?? "Erro.", "error");
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[1.1fr_1.4fr_0.8fr_1fr_0.9fr_0.9fr_auto] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
        <span>Pedido</span><span>Cliente</span><span>Parcela</span><span>Vencimento</span><span>Valor</span><span>Status</span><span></span>
      </div>
      <div className="divide-y divide-line">
        {rows.map((r) => {
          const paid = r.status === "PAGO";
          return (
            <div key={r.id} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 md:grid-cols-[1.1fr_1.4fr_0.8fr_1fr_0.9fr_0.9fr_auto] md:gap-4">
              <Link href={`/backoffice/pedidos/${r.orderNumber}`} className="font-mono text-sm font-semibold hover:text-orange">
                {r.orderNumber}
              </Link>
              <span className="hidden truncate text-sm text-ink-soft md:block">{r.customerName}</span>
              <span className="hidden text-sm text-muted md:block">{r.total > 1 ? `${r.seq}/${r.total}` : "à vista"}</span>
              <span className={cn("text-sm", r.overdue && !paid ? "font-semibold text-negative" : "text-muted")}>
                {formatDate(r.dueDate)}
              </span>
              <span className="text-sm font-semibold">{formatCents(r.amount)}</span>
              <span>
                <span className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase",
                  paid ? "border-positive/40 bg-positive/10 text-positive"
                    : r.overdue ? "border-negative/40 bg-negative/10 text-negative"
                    : "border-warning/40 bg-warning/10 text-warning",
                )}>
                  {paid ? "Pago" : r.overdue ? "Vencido" : "A vencer"}
                </span>
              </span>
              {paid ? (
                <span className="text-right text-xs text-faint">✓</span>
              ) : (
                <button
                  onClick={() => baixa(r.id)}
                  disabled={pending}
                  className="btn btn-ghost justify-self-end px-3 py-1.5 text-xs"
                >
                  {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Dar baixa
                </button>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted">Nenhum boleto nesta visão.</p>}
      </div>
    </div>
  );
}
