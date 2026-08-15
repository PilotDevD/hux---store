"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Briefcase, Search, X, Minus, Check, RotateCcw } from "lucide-react";
import { createMalaAction, settleMalaAction, cancelMalaAction } from "@/app/actions/backoffice-mala";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";

export type VariantOption = { id: string; label: string; brand: string; stock: number; price: number };
export type MalaItemRow = { id: string; productName: string; brand: string; size: string; color: string; qty: number; unitPrice: number; decision: string };
export type MalaRow = {
  id: string; customerName: string; customerPhone: string | null; notes: string | null;
  status: string; createdAt: string; expiresAt: string; orderNumber: string | null;
  items: MalaItemRow[];
};

export function MalaManager({ malas, variants }: { malas: MalaRow[]; variants: VariantOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [openNew, setOpenNew] = useState(false);
  const [busy, setBusy] = useState(false);

  // new mala form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [prazoDays, setPrazoDays] = useState("7");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<{ v: VariantOption; qty: number }[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (q ? variants.filter((v) => v.label.toLowerCase().includes(q)) : variants).slice(0, 25);
  }, [search, variants]);

  function addToCart(v: VariantOption) {
    setCart((c) => (c.some((x) => x.v.id === v.id) ? c : [...c, { v, qty: 1 }]));
    setSearch("");
  }
  function setQty(id: string, qty: number) {
    setCart((c) => c.map((x) => (x.v.id === id ? { ...x, qty: Math.max(1, Math.min(x.v.stock, qty)) } : x)));
  }
  function reset() { setCustomerName(""); setCustomerPhone(""); setPrazoDays("7"); setNotes(""); setCart([]); setSearch(""); }

  async function create() {
    if (!customerName.trim()) return toast("Informe o cliente.", "error");
    if (cart.length === 0) return toast("Adicione ao menos um produto.", "error");
    setBusy(true);
    const res = await createMalaAction({
      customerName, customerPhone, notes, prazoDays: Number(prazoDays) || 7,
      items: cart.map((x) => ({ variantId: x.v.id, qty: x.qty })),
    });
    setBusy(false);
    if (res.ok) { toast("Mala montada. Estoque provisionado.", "success"); setOpenNew(false); reset(); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  // settle
  const [settle, setSettle] = useState<MalaRow | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "COMPROU" | "DEVOLVEU">>({});
  const [rowBusy, setRowBusy] = useState(false);
  function openSettle(m: MalaRow) {
    setSettle(m);
    const d: Record<string, "COMPROU" | "DEVOLVEU"> = {};
    m.items.forEach((i) => (d[i.id] = "DEVOLVEU"));
    setDecisions(d);
  }
  async function confirmSettle() {
    if (!settle) return;
    setRowBusy(true);
    const res = await settleMalaAction(settle.id, decisions);
    setRowBusy(false);
    if (res.ok) { toast(res.number ? `Acerto ok! Venda ${res.number}.` : "Acerto concluído.", "success"); setSettle(null); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function cancel(id: string) {
    setRowBusy(true);
    const res = await cancelMalaAction(id);
    setRowBusy(false);
    if (res.ok) { toast("Mala cancelada. Estoque devolvido.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const daysLeft = (expiresAt: string) => Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const label = "data-label mb-1.5 block text-muted";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpenNew(true)} className="btn btn-primary"><Plus size={16} /> Nova mala</button>
      </div>

      {malas.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhuma mala" hint="Monte uma mala condicional para um cliente experimentar em casa." />
      ) : (
        <div className="space-y-3">
          {malas.map((m) => {
            const active = m.status === "COM_CLIENTE";
            const left = daysLeft(m.expiresAt);
            const overdue = active && left < 0;
            return (
              <div key={m.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{m.customerName}</p>
                      <Badge tone={active ? (overdue ? "danger" : "warning") : m.status === "FINALIZADA" ? "success" : "neutral"}>
                        {m.status === "COM_CLIENTE" ? (overdue ? `Atrasada ${Math.abs(left)}d` : `Com cliente · ${left}d`) : m.status === "FINALIZADA" ? "Finalizada" : "Cancelada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {m.customerPhone ? `${m.customerPhone} · ` : ""}enviada {formatDate(m.createdAt)} · prazo {formatDate(m.expiresAt)}
                      {m.orderNumber ? ` · pedido ${m.orderNumber}` : ""}
                    </p>
                  </div>
                  {active && (
                    <div className="flex gap-2">
                      <button onClick={() => openSettle(m)} disabled={rowBusy} className="btn btn-primary px-3 py-2 text-xs"><Check size={13} /> Acertar</button>
                      <button onClick={() => cancel(m.id)} disabled={rowBusy} className="btn btn-ghost px-3 py-2 text-xs text-negative"><X size={13} /> Cancelar</button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.items.map((it) => (
                    <span key={it.id} className="chip">
                      {it.qty}x {it.productName} · {it.size}/{it.color}
                      {it.decision === "COMPROU" && <Check size={12} className="text-positive" />}
                      {it.decision === "DEVOLVEU" && <RotateCcw size={12} className="text-muted" />}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New mala */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Nova mala HUX" wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Cliente *</span><input className="field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
            <label><span className={label}>Telefone (WhatsApp)</span><input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" /></label>
          </div>
          <label className="block max-w-[200px]"><span className={label}>Prazo de devolução (dias)</span>
            <input className="field" value={prazoDays} onChange={(e) => setPrazoDays(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
          </label>

          <div>
            <span className={label}>Adicionar produtos *</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input className="field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, tamanho, cor, SKU..." />
            </div>
            {search && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-[var(--radius)] border border-line">
                {filtered.map((v) => (
                  <button key={v.id} onClick={() => addToCart(v)} disabled={v.stock <= 0} className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-elevated", v.stock <= 0 && "opacity-40")}>
                    <span>{v.label}</span><span className="font-mono text-xs text-muted">{v.stock}un</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="p-3 text-center text-sm text-muted">Nada encontrado.</p>}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-2 rounded-[var(--radius)] border border-line p-3">
              {cart.map((x) => (
                <div key={x.v.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{x.v.label}</span>
                  <div className="flex items-center rounded-[var(--radius)] border border-line">
                    <button onClick={() => setQty(x.v.id, x.qty - 1)} className="grid size-7 place-items-center text-muted hover:text-ink"><Minus size={13} /></button>
                    <span className="w-7 text-center font-mono text-xs">{x.qty}</span>
                    <button onClick={() => setQty(x.v.id, x.qty + 1)} className="grid size-7 place-items-center text-muted hover:text-ink"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => setCart((c) => c.filter((y) => y.v.id !== x.v.id))} className="text-faint hover:text-negative"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}
          <label className="block"><span className={label}>Observações</span><textarea className="field min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpenNew(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={create} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Montar mala</button>
          </div>
        </div>
      </Modal>

      {/* Settle */}
      <Modal open={!!settle} onClose={() => setSettle(null)} title="Acerto da mala" wide>
        {settle && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Marque o que o cliente <strong className="text-positive">comprou</strong> e o que <strong className="text-ink-soft">devolveu</strong>. Itens comprados viram uma venda; devolvidos voltam ao estoque.</p>
            <div className="space-y-2">
              {settle.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line p-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{it.qty}x {it.productName}</p>
                    <p className="text-xs text-muted">{it.size}/{it.color} · {formatCents(it.unitPrice * it.qty)}</p>
                  </div>
                  <div className="flex overflow-hidden rounded-[var(--radius)] border border-line">
                    <button onClick={() => setDecisions((d) => ({ ...d, [it.id]: "DEVOLVEU" }))} className={cn("px-3 py-1.5 text-xs font-semibold", decisions[it.id] !== "COMPROU" ? "bg-elevated text-ink" : "text-muted")}>Devolveu</button>
                    <button onClick={() => setDecisions((d) => ({ ...d, [it.id]: "COMPROU" }))} className={cn("px-3 py-1.5 text-xs font-semibold", decisions[it.id] === "COMPROU" ? "bg-orange text-void" : "text-muted")}>Comprou</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSettle(null)} className="btn btn-ghost">Voltar</button>
              <button onClick={confirmSettle} disabled={rowBusy} className="btn btn-primary">{rowBusy && <Loader2 size={16} className="animate-spin" />} Confirmar acerto</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
