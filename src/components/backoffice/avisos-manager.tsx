"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Send, Check } from "lucide-react";
import { notifyBackInStockAction, dismissBackInStockAction } from "@/app/actions/backoffice-avisos";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export type AvisoGroup = {
  productId: string; productName: string; count: number; emails: string[]; inStock: boolean;
};

export function AvisosManager({ groups }: { groups: AvisoGroup[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function notify(id: string) {
    setBusy(id);
    const res = await notifyBackInStockAction(id);
    setBusy(null);
    if (res.ok) {
      toast(res.skipped ? "Marcado como notificado (e-mail não configurado — configure RESEND_API_KEY para envio automático)." : `E-mail enviado para ${res.emailed} cliente(s)!`, res.skipped ? "info" : "success");
      router.refresh();
    } else toast(res.error ?? "Erro.", "error");
  }
  async function dismiss(id: string) {
    setBusy(id);
    await dismissBackInStockAction(id);
    setBusy(null);
    toast("Solicitações resolvidas.", "success");
    router.refresh();
  }

  if (groups.length === 0) {
    return <EmptyState icon={BellRing} title="Nenhuma solicitação" hint="Quando um cliente pedir 'avise-me quando voltar' em um produto esgotado, aparece aqui." />;
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.productId} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{g.productName}</p>
                <Badge tone={g.inStock ? "success" : "warning"}>{g.inStock ? "Em estoque" : "Esgotado"}</Badge>
                <span className="chip">{g.count} pedido(s)</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{g.emails.slice(0, 8).join(", ")}{g.emails.length > 8 ? `  +${g.emails.length - 8}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => notify(g.productId)} disabled={busy === g.productId} className="btn btn-primary px-3 py-2 text-xs" title={g.inStock ? "" : "Produto ainda esgotado"}>
                {busy === g.productId ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Notificar clientes
              </button>
              <button onClick={() => dismiss(g.productId)} disabled={busy === g.productId} className="btn btn-ghost px-3 py-2 text-xs"><Check size={13} /> Resolver</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
