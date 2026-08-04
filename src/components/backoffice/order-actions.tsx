"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PackageCheck, Truck, Home, XCircle, Loader2 } from "lucide-react";
import {
  confirmPaymentAction, setOrderStatusAction, shipOrderAction, cancelOrderAction,
} from "@/app/actions/backoffice-orders";
import { settleOrderBoletosAction } from "@/app/actions/backoffice-boletos";
import { useToast } from "@/components/ui/toast";
import { Barcode } from "lucide-react";

export function OrderActions({
  number,
  status,
  paymentMethod = "PIX_MANUAL",
}: {
  number: string;
  status: string;
  paymentMethod?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(okMsg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Erro.", "error");
      }
    });
  }

  const btn = "btn w-full justify-start";

  return (
    <div className="card p-5">
      <p className="eyebrow mb-4">Ações do pedido</p>
      <div className="space-y-2.5">
        {status === "AGUARDANDO_PAGAMENTO" && paymentMethod === "BOLETO" && (
          <button
            disabled={pending}
            onClick={() => run(() => settleOrderBoletosAction(number), "Boletos baixados. Pagamento confirmado!")}
            className={`${btn} btn-primary`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Barcode size={16} />}
            Dar baixa nos boletos
          </button>
        )}
        {status === "AGUARDANDO_PAGAMENTO" && paymentMethod !== "BOLETO" && (
          <button
            disabled={pending}
            onClick={() => run(() => confirmPaymentAction(number), "Pagamento confirmado!")}
            className={`${btn} btn-primary`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Confirmar pagamento Pix
          </button>
        )}

        {status === "PAGO" && (
          <button
            disabled={pending}
            onClick={() => run(() => setOrderStatusAction(number, "EM_SEPARACAO"), "Pedido em separação.")}
            className={`${btn} btn-light`}
          >
            <PackageCheck size={16} /> Iniciar separação
          </button>
        )}

        {status === "EM_SEPARACAO" && (
          <div className="space-y-2">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Código de rastreio (opcional)"
              className="field py-2.5"
            />
            <button
              disabled={pending}
              onClick={() => run(() => shipOrderAction(number, tracking), "Pedido marcado como enviado.")}
              className={`${btn} btn-primary`}
            >
              <Truck size={16} /> Marcar como enviado
            </button>
          </div>
        )}

        {status === "ENVIADO" && (
          <button
            disabled={pending}
            onClick={() => run(() => setOrderStatusAction(number, "ENTREGUE"), "Pedido entregue!")}
            className={`${btn} btn-primary`}
          >
            <Home size={16} /> Confirmar entrega
          </button>
        )}

        {status !== "CANCELADO" && status !== "ENTREGUE" && (
          <>
            {showCancel ? (
              <div className="space-y-2 rounded-[var(--radius)] border border-negative/30 p-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo do cancelamento"
                  className="field py-2.5"
                />
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() => run(() => cancelOrderAction(number, reason), "Pedido cancelado. Estoque devolvido.")}
                    className="btn btn-ghost flex-1 border-negative/40 text-negative hover:bg-negative/10"
                  >
                    Confirmar cancelamento
                  </button>
                  <button onClick={() => setShowCancel(false)} className="btn btn-ghost">Voltar</button>
                </div>
                <p className="text-xs text-faint">O estoque dos itens será devolvido automaticamente.</p>
              </div>
            ) : (
              <button onClick={() => setShowCancel(true)} className={`${btn} btn-ghost text-negative`}>
                <XCircle size={16} /> Cancelar pedido
              </button>
            )}
          </>
        )}

        {status === "ENTREGUE" && (
          <p className="rounded-[var(--radius)] border border-positive/30 bg-positive/5 px-3 py-2.5 text-center text-sm text-positive">
            Pedido concluído ✓
          </p>
        )}
        {status === "CANCELADO" && (
          <p className="rounded-[var(--radius)] border border-negative/30 bg-negative/5 px-3 py-2.5 text-center text-sm text-negative">
            Pedido cancelado
          </p>
        )}
      </div>
    </div>
  );
}
