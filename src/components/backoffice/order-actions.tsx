"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PackageCheck, Truck, Home, XCircle, Loader2, Undo2, RefreshCw } from "lucide-react";
import {
  confirmPaymentAction, setOrderStatusAction, shipOrderAction, cancelOrderAction,
  refundOrderPaymentAction, changeOrderPaymentMethodAction,
} from "@/app/actions/backoffice-orders";
import { settleOrderBoletosAction } from "@/app/actions/backoffice-boletos";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, SPLIT_PAYMENT_METHODS } from "@/lib/enums";
import { Barcode } from "lucide-react";

type PayRow = { kind: string; method: string; amount: number };

export function OrderActions({
  number,
  status,
  paymentMethod = "PIX_MANUAL",
  paymentStatus = "CONFIRMADO",
  total = 0,
  payments = [],
}: {
  number: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  total?: number;
  payments?: PayRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundMethod, setRefundMethod] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [showChange, setShowChange] = useState(false);
  const [changeMethod, setChangeMethod] = useState("");

  // Saldo líquido por forma (recebido - estornado). Para pedidos antigos sem
  // linhas, assume o total na forma principal.
  const netByMethod = new Map<string, number>();
  if (payments.length > 0) {
    for (const p of payments) netByMethod.set(p.method, (netByMethod.get(p.method) ?? 0) + (p.kind === "ESTORNO" ? -p.amount : p.amount));
  } else if ((SPLIT_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    netByMethod.set(paymentMethod, total);
  }
  const refundable = [...netByMethod.entries()].filter(([, v]) => v > 0);
  const isSplit = paymentMethod === "MULTIPLO" || payments.filter((p) => p.kind === "PAGAMENTO").length > 1;
  const canChangeMethod = status !== "CANCELADO" && paymentMethod !== "A_PRAZO" && !isSplit && paymentStatus === "CONFIRMADO";
  const canRefund = status !== "CANCELADO" && paymentStatus === "CONFIRMADO" && refundable.length > 0;

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

        {/* Alterar forma de pagamento (item 2) */}
        {canChangeMethod && (
          showChange ? (
            <div className="space-y-2 rounded-[var(--radius)] border border-line p-3">
              <label className="data-label text-muted">Nova forma de pagamento</label>
              <select className="field py-2.5" value={changeMethod} onChange={(e) => setChangeMethod(e.target.value)}>
                <option value="">— escolher —</option>
                {SPLIT_PAYMENT_METHODS.filter((m) => m !== paymentMethod).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  disabled={pending || !changeMethod}
                  onClick={() => run(() => changeOrderPaymentMethodAction(number, changeMethod), "Forma de pagamento alterada.")}
                  className="btn btn-primary flex-1 disabled:opacity-40"
                >
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Salvar
                </button>
                <button onClick={() => { setShowChange(false); setChangeMethod(""); }} className="btn btn-ghost">Voltar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowChange(true)} className={`${btn} btn-ghost`}>
              <RefreshCw size={16} /> Alterar forma de pagamento
            </button>
          )
        )}

        {/* Estorno parcial por forma (item 10) */}
        {canRefund && (
          showRefund ? (
            <div className="space-y-2 rounded-[var(--radius)] border border-negative/30 p-3">
              <label className="data-label text-muted">Estornar — forma e valor</label>
              <select className="field py-2.5" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                <option value="">— forma —</option>
                {refundable.map(([m, v]) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m} (disp. {formatCents(v)})</option>)}
              </select>
              <input className="field py-2.5" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Valor a estornar (R$)" inputMode="decimal" />
              <div className="flex gap-2">
                <button
                  disabled={pending || !refundMethod || !refundAmount.trim()}
                  onClick={() => run(() => refundOrderPaymentAction(number, refundMethod, refundAmount), "Estorno registrado.")}
                  className="btn btn-ghost flex-1 border-negative/40 text-negative hover:bg-negative/10 disabled:opacity-40"
                >
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />} Confirmar estorno
                </button>
                <button onClick={() => { setShowRefund(false); setRefundMethod(""); setRefundAmount(""); }} className="btn btn-ghost">Voltar</button>
              </div>
              <p className="text-xs text-faint">Estorna um valor numa forma (ex.: só a parte do cartão). Dinheiro sai do caixa. Ao estornar o total, a venda vira ESTORNADA.</p>
            </div>
          ) : (
            <button onClick={() => setShowRefund(true)} className={`${btn} btn-ghost text-negative`}>
              <Undo2 size={16} /> Estornar pagamento
            </button>
          )
        )}

        {status !== "CANCELADO" && (
          <>
            {showCancel ? (
              <div className="space-y-2 rounded-[var(--radius)] border border-negative/30 p-3">
                <label className="data-label text-muted">Motivo do cancelamento *</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: cliente desistiu, troca, erro de lançamento…"
                  className="field py-2.5"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    disabled={pending || reason.trim().length < 3}
                    onClick={() => run(() => cancelOrderAction(number, reason.trim()), "Venda cancelada. Estoque devolvido.")}
                    className="btn btn-ghost flex-1 border-negative/40 text-negative hover:bg-negative/10 disabled:opacity-40"
                  >
                    {pending ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Confirmar cancelamento
                  </button>
                  <button onClick={() => { setShowCancel(false); setReason(""); }} className="btn btn-ghost">Voltar</button>
                </div>
                <p className="text-xs text-faint">O estoque dos itens volta automaticamente e as parcelas pendentes são canceladas. A venda permanece no histórico como cancelada.</p>
              </div>
            ) : (
              <button onClick={() => setShowCancel(true)} className={`${btn} btn-ghost text-negative`}>
                <XCircle size={16} /> Cancelar venda
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
