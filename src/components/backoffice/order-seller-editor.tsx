"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog, Check } from "lucide-react";
import { changeOrderSellerAction } from "@/app/actions/backoffice-orders";
import { useToast } from "@/components/ui/toast";

export function OrderSellerEditor({
  number, currentSeller, currentSellerId, sellers,
}: {
  number: string;
  currentSeller: string | null;
  currentSellerId: string | null;
  sellers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [sellerId, setSellerId] = useState(currentSellerId ?? sellers[0]?.id ?? "");
  const [pending, start] = useTransition();

  function save() {
    if (!sellerId) return;
    start(async () => {
      const res = await changeOrderSellerAction(number, sellerId);
      if (res.ok) { toast("Vendedor alterado.", "success"); setEditing(false); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="data-label mb-2 flex items-center gap-1.5 text-muted"><UserCog size={13} /> Vendedor</p>
      {!editing ? (
        <div className="flex items-center justify-between text-sm">
          <span>{currentSeller ?? <span className="text-muted">—</span>}</span>
          <button onClick={() => { setSellerId(currentSellerId ?? sellers[0]?.id ?? ""); setEditing(true); }} className="text-xs text-orange hover:underline">alterar</button>
        </div>
      ) : (
        <div className="space-y-2">
          <select className="field py-2" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="btn btn-primary flex-1 py-2 text-xs">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost py-2 text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
