"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Loader2 } from "lucide-react";
import { adjustStockAction } from "@/app/actions/backoffice-catalog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type StockRow = {
  variantId: string; productName: string; brand: string; sku: string;
  size: string; color: string; stock: number;
};

function RowAdjust({ row }: { row: StockRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [qty, setQty] = useState("1");
  const [pending, start] = useTransition();

  function adjust(type: "ENTRADA" | "SAIDA") {
    const n = parseInt(qty, 10);
    if (!n || n < 1) return toast("Quantidade inválida.", "error");
    start(async () => {
      const res = await adjustStockAction({ variantId: row.variantId, type, qty: n, reason: type === "ENTRADA" ? "Reposição" : "Baixa manual" });
      if (res.ok) {
        toast("Estoque atualizado.", "success");
        router.refresh();
      } else toast(res.error ?? "Erro.", "error");
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
        className="field w-14 px-2 py-1.5 text-center"
        inputMode="numeric"
        aria-label="Quantidade"
      />
      <button onClick={() => adjust("ENTRADA")} disabled={pending} className="grid size-8 place-items-center rounded-[var(--radius)] border border-line text-positive hover:bg-positive/10" aria-label="Entrada">
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
      </button>
      <button onClick={() => adjust("SAIDA")} disabled={pending} className="grid size-8 place-items-center rounded-[var(--radius)] border border-line text-negative hover:bg-negative/10" aria-label="Saída">
        <Minus size={15} />
      </button>
    </div>
  );
}

export function StockTable({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");
  const filtered = q
    ? rows.filter((r) =>
        `${r.productName} ${r.brand} ${r.sku} ${r.color} ${r.size}`.toLowerCase().includes(q.toLowerCase()),
      )
    : rows;

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por produto, SKU, cor…"
        className="field mb-4 max-w-sm"
      />
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[2fr_1fr_0.8fr_0.6fr_auto] gap-4 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
          <span>Produto</span><span>SKU</span><span>Cor / Tam.</span><span>Estoque</span><span>Ajuste</span>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((r) => (
            <div key={r.variantId} className="grid grid-cols-2 items-center gap-3 px-4 py-3 md:grid-cols-[2fr_1fr_0.8fr_0.6fr_auto] md:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.productName}</p>
                <p className="font-mono text-xs text-muted">{r.brand}</p>
              </div>
              <span className="hidden font-mono text-xs text-muted md:block">{r.sku}</span>
              <span className="hidden text-sm text-ink-soft md:block">{r.color} · {r.size}</span>
              <span className={cn("font-mono text-sm font-bold", r.stock === 0 ? "text-negative" : r.stock <= 3 ? "text-warning" : "text-ink")}>
                {r.stock} un
              </span>
              <RowAdjust row={r} />
            </div>
          ))}
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted">Nada encontrado.</p>}
        </div>
      </div>
    </>
  );
}
