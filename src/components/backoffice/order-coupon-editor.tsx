"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Loader2, Check } from "lucide-react";
import { changeOrderCouponAction } from "@/app/actions/backoffice-orders";
import { useToast } from "@/components/ui/toast";

export function OrderCouponEditor({ number, currentCode }: { number: string; currentCode: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(currentCode ?? "");
  const [pending, start] = useTransition();

  function apply(newCode: string) {
    start(async () => {
      const res = await changeOrderCouponAction(number, newCode);
      if (res.ok) { toast(newCode ? "Cupom alterado." : "Cupom removido.", "success"); setEditing(false); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="data-label mb-2 flex items-center gap-1.5 text-muted"><Ticket size={13} /> Cupom</p>
      {!editing ? (
        <div className="flex items-center justify-between text-sm">
          {currentCode
            ? <span className="font-mono font-semibold text-positive">{currentCode}</span>
            : <span className="text-muted">Nenhum</span>}
          <button onClick={() => { setCode(currentCode ?? ""); setEditing(true); }} className="text-xs text-orange hover:underline">alterar</button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className="field py-2 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código do cupom"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(code); } }}
          />
          <div className="flex gap-2">
            <button onClick={() => apply(code)} disabled={pending || !code.trim()} className="btn btn-primary flex-1 py-2 text-xs">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aplicar
            </button>
            {currentCode && (
              <button onClick={() => apply("")} disabled={pending} className="btn btn-ghost py-2 text-xs text-negative">Remover</button>
            )}
            <button onClick={() => setEditing(false)} className="btn btn-ghost py-2 text-xs">Cancelar</button>
          </div>
          <p className="text-xs text-faint">O desconto e o total são recalculados a partir do cupom.</p>
        </div>
      )}
    </div>
  );
}
