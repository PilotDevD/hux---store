"use client";

import { useState } from "react";
import { Truck, Loader2, Search, MapPin } from "lucide-react";
import { quoteShippingByCepAction, type CepQuote } from "@/app/actions/checkout";
import { formatCents } from "@/lib/money";
import { maskCep, onlyDigits } from "@/lib/utils";

export function ShippingCalculator({
  subtotalCents = 0,
  compact = false,
}: {
  subtotalCents?: number;
  compact?: boolean;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CepQuote | null>(null);

  async function calc() {
    if (onlyDigits(cep).length !== 8) {
      setResult({ ok: false, error: "Informe um CEP válido (8 dígitos)." });
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await quoteShippingByCepAction(cep, subtotalCents);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className={compact ? "" : "rounded-[var(--radius-lg)] border border-line bg-surface p-5"}>
      {!compact && (
        <p className="eyebrow mb-3 flex items-center gap-2">
          <Truck size={14} /> Calcular frete e prazo
        </p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={cep}
            onChange={(e) => setCep(maskCep(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && calc()}
            placeholder="Digite seu CEP"
            inputMode="numeric"
            aria-label="CEP"
            className="field pr-9"
          />
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint" />
        </div>
        <button onClick={calc} disabled={loading} className="btn btn-ghost shrink-0 px-4">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Calcular"}
        </button>
      </div>

      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-faint underline-offset-2 hover:text-orange hover:underline"
      >
        Não sei meu CEP
      </a>

      {result && (
        <div className="mt-3">
          {result.ok ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-void px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin size={14} className="text-orange" />
                  {result.city}/{result.state}
                </p>
                <p className="text-xs text-muted">{result.quote.label}</p>
              </div>
              <span className={`shrink-0 font-display text-xl ${result.quote.free ? "text-positive" : "text-ink"}`}>
                {result.quote.free ? "Grátis" : formatCents(result.quote.price)}
              </span>
            </div>
          ) : (
            <p className="rounded-[var(--radius)] border border-negative/30 bg-negative/5 px-3 py-2.5 text-sm text-negative">
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
