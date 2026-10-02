"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Loader2, SlidersHorizontal, Search, X, Check, History } from "lucide-react";
import { adjustStockAction, getVariantMovementsAction, type VariantMovement } from "@/app/actions/backoffice-catalog";
import { Modal } from "./modal";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS } from "@/lib/enums";

export type StockRow = {
  variantId: string; productName: string; brand: string; type: string; sku: string;
  size: string; color: string; stock: number;
};

type Filters = { brands: string[]; types: string[]; sizes: string[]; status: string[] };
const emptyFilters: Filters = { brands: [], types: [], sizes: [], status: [] };

const STATUS_OPTS = [
  { value: "ok", label: "Em estoque" },
  { value: "low", label: "Estoque baixo (≤3)" },
  { value: "out", label: "Esgotado" },
];

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
      if (res.ok) { toast("Estoque atualizado.", "success"); router.refresh(); }
      else toast(res.error ?? "Erro.", "error");
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className="field w-14 px-2 py-1.5 text-center" inputMode="numeric" aria-label="Quantidade" />
      <button onClick={() => adjust("ENTRADA")} disabled={pending} className="grid size-8 place-items-center rounded-[var(--radius)] border border-line text-positive hover:bg-positive/10" aria-label="Entrada">
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
      </button>
      <button onClick={() => adjust("SAIDA")} disabled={pending} className="grid size-8 place-items-center rounded-[var(--radius)] border border-line text-negative hover:bg-negative/10" aria-label="Saída">
        <Minus size={15} />
      </button>
    </div>
  );
}

function CheckGroup({ title, options, selected, onToggle }: {
  title: string; options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="data-label mb-2 text-muted">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", on ? "border-orange bg-orange/10 text-orange" : "border-line text-muted hover:border-ink-soft")}
            >
              <span className={cn("grid size-3.5 place-items-center rounded-sm border", on ? "border-orange bg-orange text-void" : "border-ink-soft")}>{on && <Check size={10} />}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StockTable({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [histRow, setHistRow] = useState<StockRow | null>(null);
  const [movs, setMovs] = useState<VariantMovement[] | null>(null);

  async function openHistory(row: StockRow) {
    setHistRow(row);
    setMovs(null);
    const data = await getVariantMovementsAction(row.variantId);
    setMovs(data);
  }
  const [pending, setPending] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);

  // Distinct options from the data.
  const brandOpts = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort().map((b) => ({ value: b, label: b })), [rows]);
  const typeOpts = useMemo(() => [...new Set(rows.map((r) => r.type))].sort().map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t as keyof typeof PRODUCT_TYPE_LABELS] ?? t })), [rows]);
  const sizeOpts = useMemo(() => [...new Set(rows.map((r) => r.size))].map((s) => ({ value: s, label: SIZE_LABELS[s as keyof typeof SIZE_LABELS] ?? s })), [rows]);

  const toggle = (key: keyof Filters, v: string) =>
    setPending((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));

  function apply() { setApplied(pending); setPanelOpen(false); }
  function clear() { setPending(emptyFilters); setApplied(emptyFilters); }

  const activeCount = applied.brands.length + applied.types.length + applied.sizes.length + applied.status.length;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (query && !`${r.productName} ${r.brand} ${r.sku} ${r.color} ${r.size}`.toLowerCase().includes(query)) return false;
      if (applied.brands.length && !applied.brands.includes(r.brand)) return false;
      if (applied.types.length && !applied.types.includes(r.type)) return false;
      if (applied.sizes.length && !applied.sizes.includes(r.size)) return false;
      if (applied.status.length) {
        const st = r.stock === 0 ? "out" : r.stock <= 3 ? "low" : "ok";
        if (!applied.status.includes(st)) return false;
      }
      return true;
    });
  }, [rows, q, applied]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por produto, SKU, cor…" className="field py-2.5 pl-9" />
        </div>
        <button onClick={() => setPanelOpen((o) => !o)} className={cn("btn btn-ghost", activeCount > 0 && "border-orange/60 text-orange")}>
          <SlidersHorizontal size={15} /> Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 && (
          <button onClick={clear} className="inline-flex items-center gap-1 font-mono text-xs text-faint hover:text-negative"><X size={13} /> Limpar</button>
        )}
      </div>

      {panelOpen && (
        <div className="mb-4 space-y-4 rounded-[var(--radius)] border border-line bg-void p-4">
          <CheckGroup title="Marca" options={brandOpts} selected={pending.brands} onToggle={(v) => toggle("brands", v)} />
          <CheckGroup title="Categoria" options={typeOpts} selected={pending.types} onToggle={(v) => toggle("types", v)} />
          <CheckGroup title="Tamanho" options={sizeOpts} selected={pending.sizes} onToggle={(v) => toggle("sizes", v)} />
          <CheckGroup title="Situação" options={STATUS_OPTS} selected={pending.status} onToggle={(v) => toggle("status", v)} />
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button onClick={() => setPending(emptyFilters)} className="btn btn-ghost px-3 py-2 text-xs">Limpar seleção</button>
            <button onClick={apply} className="btn btn-primary px-3 py-2 text-xs"><Check size={14} /> Aplicar filtros</button>
          </div>
        </div>
      )}

      <p className="mb-2 text-xs text-faint">{filtered.length} de {rows.length} variantes</p>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[2fr_1fr_0.8fr_0.6fr_auto] gap-4 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
          <span>Produto</span><span>SKU</span><span>Cor / Tam.</span><span>Estoque</span><span>Ajuste</span>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((r) => (
            <div key={r.variantId} className="grid grid-cols-2 items-center gap-3 px-4 py-3 md:grid-cols-[2fr_1fr_0.8fr_0.6fr_auto] md:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.productName}</p>
                <p className="font-mono text-xs text-muted">{r.brand} · {PRODUCT_TYPE_LABELS[r.type as keyof typeof PRODUCT_TYPE_LABELS] ?? r.type}</p>
              </div>
              <span className="hidden font-mono text-xs text-muted md:block">{r.sku}</span>
              <span className="hidden text-sm text-ink-soft md:block">{r.color} · {r.size}</span>
              <span className={cn("font-mono text-sm font-bold", r.stock === 0 ? "text-negative" : r.stock <= 3 ? "text-warning" : "text-ink")}>{r.stock} un</span>
              <div className="flex items-center gap-1.5">
                <RowAdjust row={r} />
                <button onClick={() => openHistory(r)} className="grid size-8 place-items-center rounded-[var(--radius)] border border-line text-faint hover:text-orange" aria-label="Histórico de movimentações" title="Histórico de movimentações">
                  <History size={15} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted">Nada encontrado.</p>}
        </div>
      </div>

      <Modal open={!!histRow} onClose={() => setHistRow(null)} title="Histórico de estoque" wide>
        {histRow && (
          <div className="space-y-3">
            <div>
              <p className="font-semibold">{histRow.productName}</p>
              <p className="font-mono text-xs text-muted">{histRow.brand} · {histRow.color} · {histRow.size} · {histRow.sku} · estoque atual: {histRow.stock}</p>
            </div>
            {movs === null ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted"><Loader2 size={15} className="animate-spin" /> Carregando…</p>
            ) : movs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="max-h-[55vh] divide-y divide-line overflow-y-auto rounded-[var(--radius)] border border-line">
                {movs.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", m.type === "ENTRADA" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                      {m.type === "ENTRADA" ? <Plus size={13} /> : <Minus size={13} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{m.reason}</p>
                      <p className="text-xs text-faint">{formatDate(m.createdAt)}{m.user ? ` · ${m.user}` : " · sistema"}</p>
                    </div>
                    <span className={cn("shrink-0 font-mono font-semibold", m.type === "ENTRADA" ? "text-positive" : "text-negative")}>
                      {m.type === "ENTRADA" ? "+" : "−"}{m.qty}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
