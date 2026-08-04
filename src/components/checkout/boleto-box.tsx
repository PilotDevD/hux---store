"use client";

import { useState } from "react";
import { Barcode, Copy, Check } from "lucide-react";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Installment = {
  id: string; seq: number; amount: number; dueDate: Date | string;
  status: string; linha: string | null; paidAt?: Date | string | null;
};

export function BoletoBox({ installments }: { installments: Installment[] }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const total = installments.length;

  async function copy(linha: string, id: string) {
    try {
      await navigator.clipboard.writeText(linha.replace(/\s/g, ""));
      setCopied(id);
      toast("Linha digitável copiada!", "success");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast("Não foi possível copiar.", "error");
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-void/50 px-5 py-3">
        <Barcode size={16} className="text-orange" />
        <p className="eyebrow">Boleto{total > 1 ? `s · ${total}x` : " bancário"}</p>
      </div>
      <div className="divide-y divide-line">
        {installments.map((inst) => {
          const paid = inst.status === "PAGO";
          return (
            <div key={inst.id} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {total > 1 ? `Parcela ${inst.seq}/${total}` : "Boleto à vista"}
                    <span className="ml-2 text-sm text-muted">venc. {formatDate(inst.dueDate)}</span>
                  </p>
                  <p className="font-display text-2xl text-orange">{formatCents(inst.amount)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase",
                    paid ? "border-positive/40 bg-positive/10 text-positive" : "border-warning/40 bg-warning/10 text-warning",
                  )}
                >
                  {paid ? "Pago" : "Pendente"}
                </span>
              </div>
              {!paid && inst.linha && (
                <>
                  <div className="rounded-[var(--radius)] border border-line bg-void px-3 py-2.5">
                    <p className="break-all font-mono text-[0.72rem] text-ink-soft">{inst.linha}</p>
                  </div>
                  <button onClick={() => copy(inst.linha!, inst.id)} className="btn btn-ghost mt-2 w-full py-2 text-xs">
                    {copied === inst.id ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar linha digitável</>}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-faint">
        Boleto de demonstração (sem emissão bancária real). Com a integração PagSeguro, a linha
        digitável e o PDF virão do banco emissor.
      </p>
    </div>
  );
}
