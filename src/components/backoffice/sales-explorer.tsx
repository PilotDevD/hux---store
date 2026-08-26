"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Search, X, Check } from "lucide-react";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, SALE_CHANNEL_LABELS, ORDER_STATUS_LABELS } from "@/lib/enums";
import { OrderStatusBadge } from "@/components/ui/badge";

export type SaleRow = {
  number: string; channel: string; customerName: string; seller: string; sellerId: string | null;
  paymentMethod: string; status: string; total: number; createdAt: string; products: string; brands: string[];
};

type Filters = { canal: string[]; seller: string[]; brand: string[]; metodo: string[]; status: string[] };
const empty: Filters = { canal: [], seller: [], brand: [], metodo: [], status: [] };

function CheckGroup({ title, options, selected, onToggle }: {
  title: string; options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="data-label mb-2 text-muted">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button key={o.value} type="button" onClick={() => onToggle(o.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", on ? "border-orange bg-orange/10 text-orange" : "border-line text-muted hover:border-ink-soft")}>
              <span className={cn("grid size-3.5 place-items-center rounded-sm border", on ? "border-orange bg-orange text-void" : "border-ink-soft")}>{on && <Check size={10} />}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SalesExplorer({ sales, sellers, brands }: {
  sales: SaleRow[];
  sellers: { id: string; name: string }[];
  brands: string[];
}) {
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [pending, setPending] = useState<Filters>(empty);
  const [applied, setApplied] = useState<Filters>(empty);

  const toggle = (key: keyof Filters, v: string) =>
    setPending((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));
  function apply() { setApplied(pending); setPanelOpen(false); }
  function clearAll() { setPending(empty); setApplied(empty); setQ(""); setDe(""); setAte(""); }

  const canalOpts = [...new Set(sales.map((s) => s.channel))].map((c) => ({ value: c, label: SALE_CHANNEL_LABELS[c] ?? c }));
  const methodOpts = [...new Set(sales.map((s) => s.paymentMethod))].map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] ?? m }));
  const statusOpts = [...new Set(sales.map((s) => s.status))].map((st) => ({ value: st, label: ORDER_STATUS_LABELS[st as keyof typeof ORDER_STATUS_LABELS] ?? st }));
  const sellerOpts = sellers.map((s) => ({ value: s.id, label: s.name }));
  const brandOpts = brands.map((b) => ({ value: b, label: b }));

  const activeCount = applied.canal.length + applied.seller.length + applied.brand.length + applied.metodo.length + applied.status.length + (de ? 1 : 0) + (ate ? 1 : 0);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const deTs = de ? new Date(`${de}T00:00:00`).getTime() : null;
    const ateTs = ate ? new Date(`${ate}T23:59:59`).getTime() : null;
    return sales.filter((s) => {
      if (query && !`${s.number} ${s.customerName} ${s.seller} ${s.products}`.toLowerCase().includes(query)) return false;
      if (applied.canal.length && !applied.canal.includes(s.channel)) return false;
      if (applied.seller.length && !(s.sellerId && applied.seller.includes(s.sellerId))) return false;
      if (applied.metodo.length && !applied.metodo.includes(s.paymentMethod)) return false;
      if (applied.status.length && !applied.status.includes(s.status)) return false;
      if (applied.brand.length && !s.brands.some((b) => applied.brand.includes(b))) return false;
      const ts = new Date(s.createdAt).getTime();
      if (deTs && ts < deTs) return false;
      if (ateTs && ts > ateTs) return false;
      return true;
    });
  }, [sales, q, de, ate, applied]);

  const total = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por venda, cliente, vendedor ou produto…" className="field py-2.5 pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="field py-2 text-sm" aria-label="De" />
          <span className="text-faint">→</span>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="field py-2 text-sm" aria-label="Até" />
        </div>
        <button onClick={() => setPanelOpen((o) => !o)} className={cn("btn btn-ghost", (applied.canal.length + applied.seller.length + applied.brand.length + applied.metodo.length + applied.status.length) > 0 && "border-orange/60 text-orange")}>
          <SlidersHorizontal size={15} /> Filtros
        </button>
        {activeCount > 0 && <button onClick={clearAll} className="inline-flex items-center gap-1 font-mono text-xs text-faint hover:text-negative"><X size={13} /> Limpar</button>}
      </div>

      {panelOpen && (
        <div className="mb-4 space-y-4 rounded-[var(--radius)] border border-line bg-void p-4">
          <CheckGroup title="Canal" options={canalOpts} selected={pending.canal} onToggle={(v) => toggle("canal", v)} />
          <CheckGroup title="Vendedor" options={sellerOpts} selected={pending.seller} onToggle={(v) => toggle("seller", v)} />
          <CheckGroup title="Marca" options={brandOpts} selected={pending.brand} onToggle={(v) => toggle("brand", v)} />
          <CheckGroup title="Pagamento" options={methodOpts} selected={pending.metodo} onToggle={(v) => toggle("metodo", v)} />
          <CheckGroup title="Status" options={statusOpts} selected={pending.status} onToggle={(v) => toggle("status", v)} />
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button onClick={() => setPending(empty)} className="btn btn-ghost px-3 py-2 text-xs">Limpar seleção</button>
            <button onClick={apply} className="btn btn-primary px-3 py-2 text-xs"><Check size={14} /> Aplicar filtros</button>
          </div>
        </div>
      )}

      <p className="mb-3 text-sm text-muted">{filtered.length} venda(s) · <strong className="text-ink">{formatCents(total)}</strong></p>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">Nenhuma venda encontrada com esses filtros.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.1fr_1.5fr_1fr_0.9fr_0.9fr_0.9fr_auto] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
            <span>Venda</span><span>Cliente / produto</span><span>Vendedor</span><span>Data</span><span>Pgto</span><span>Total</span><span></span>
          </div>
          <div className="divide-y divide-line">
            {filtered.map((o) => (
              <div key={o.number} className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-[1.1fr_1.5fr_1fr_0.9fr_0.9fr_0.9fr_auto] md:gap-4">
                <span className="flex flex-col">
                  <span className="font-mono text-sm font-semibold">{o.number}</span>
                  <span className={cn("w-fit rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium", o.channel === "MANUAL" ? "bg-positive/10 text-positive" : "bg-info/10 text-info")}>{SALE_CHANNEL_LABELS[o.channel] ?? o.channel}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-soft">{o.customerName}</span>
                  <span className="block truncate font-mono text-xs text-faint">{o.products}</span>
                </span>
                <span className="hidden truncate text-sm text-muted md:block">{o.seller}</span>
                <span className="hidden text-sm text-muted md:block">{formatDate(o.createdAt)}</span>
                <span className="hidden text-xs text-muted md:block">{PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{formatCents(o.total)}</span>
                  <span className="md:hidden"><OrderStatusBadge status={o.status} /></span>
                </span>
                <span className="flex items-center justify-end gap-3">
                  <Link href={`/backoffice/pedidos/${o.number}`} className="text-xs text-ink-soft hover:text-orange hover:underline">gerenciar</Link>
                  <Link href={`/backoffice/recibo/${o.number}`} target="_blank" className="text-xs text-orange hover:underline">recibo</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
