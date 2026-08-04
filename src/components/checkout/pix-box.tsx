"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatCents } from "@/lib/money";
import { useToast } from "@/components/ui/toast";

export function PixBox({
  payload,
  qrSvg,
  amount,
}: {
  payload: string;
  qrSvg: string;
  amount: number;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast("Código Pix copiado!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Não foi possível copiar. Selecione o código manualmente.", "error");
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-void/50 px-5 py-3">
        <p className="eyebrow">Pague com Pix · {formatCents(amount)}</p>
      </div>
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div
          className="mx-auto w-40 overflow-hidden rounded-[var(--radius)] bg-white p-2 sm:mx-0"
          // qrcode SVG is safe, generated server-side from our own payload
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div>
          <ol className="mb-4 space-y-1.5 text-sm text-muted">
            <li>1. Abra o app do seu banco e escolha <strong className="text-ink-soft">Pix</strong>.</li>
            <li>2. Selecione <strong className="text-ink-soft">Pagar com QR Code</strong> ou <strong className="text-ink-soft">Copia e Cola</strong>.</li>
            <li>3. Confirme o valor e conclua o pagamento.</li>
          </ol>
          <div className="rounded-[var(--radius)] border border-line bg-void p-3">
            <p className="break-all font-mono text-[0.7rem] leading-relaxed text-ink-soft">{payload}</p>
          </div>
          <button onClick={copy} className="btn btn-primary mt-3 w-full">
            {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar código Pix</>}
          </button>
        </div>
      </div>
    </div>
  );
}
