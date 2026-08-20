"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Search, X, Minus, Undo2, ArrowLeftRight, PackageSearch } from "lucide-react";
import { Modal } from "./modal";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  lookupOrderForReturnAction, processReturnAction, type ReturnLookup,
} from "@/app/actions/backoffice-trocas";
import type { VariantOption } from "./vendas-manager";

type Sel = { include: boolean; qty: number; mode: "DEVOLVER" | "TROCAR"; newVariant: VariantOption | null };
type LoadedOrder = NonNullable<ReturnLookup["order"]>;

export function TrocasManager({ variants }: { variants: VariantOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<LoadedOrder | null>(null);
  const [sel, setSel] = useState<Record<string, Sel>>({});
  const [reason, setReason] = useState("");
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [pickSearch, setPickSearch] = useState("");

  function resetAll() { setCode(""); setOrder(null); setSel({}); setReason(""); setPickFor(null); setPickSearch(""); }
  function close() { setOpen(false); resetAll(); }

  async function lookup() {
    if (!code.trim()) return toast("Digite o código da venda.", "error");
    setLooking(true);
    const res = await lookupOrderForReturnAction(code);
    setLooking(false);
    if (!res.ok || !res.order) { setOrder(null); return toast(res.error ?? "Não encontrado.", "error"); }
    setOrder(res.order);
    const init: Record<string, Sel> = {};
    for (const it of res.order.items) {
      init[it.orderItemId] = { include: false, qty: Math.max(1, Math.min(1, it.availableQty)), mode: "DEVOLVER", newVariant: null };
    }
    setSel(init);
  }

  const update = (id: string, patch: Partial<Sel>) => setSel((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  const chosen = order ? order.items.filter((it) => sel[it.orderItemId]?.include && sel[it.orderItemId]?.qty > 0) : [];
  const refund = chosen
    .filter((it) => sel[it.orderItemId].mode === "DEVOLVER")
    .reduce((s, it) => s + it.unitPrice * sel[it.orderItemId].qty, 0);
  const diff = chosen
    .filter((it) => sel[it.orderItemId].mode === "TROCAR" && sel[it.orderItemId].newVariant)
    .reduce((s, it) => s + (sel[it.orderItemId].newVariant!.price - it.unitPrice) * sel[it.orderItemId].qty, 0);
  const hasTroca = chosen.some((it) => sel[it.orderItemId].mode === "TROCAR");

  const filteredVariants = useMemo(() => {
    const q = pickSearch.toLowerCase();
    return (q ? variants.filter((v) => v.label.toLowerCase().includes(q)) : variants).slice(0, 25);
  }, [pickSearch, variants]);

  async function submit() {
    if (!order) return;
    if (chosen.length === 0) return toast("Selecione ao menos um item.", "error");
    if (reason.trim().length < 3) return toast("Descreva o motivo.", "error");
    for (const it of chosen) {
      const s = sel[it.orderItemId];
      if (s.mode === "TROCAR" && !s.newVariant) return toast(`Escolha o produto de troca para "${it.productName}".`, "error");
    }
    setBusy(true);
    const res = await processReturnAction({
      orderNumber: order.number,
      reason,
      items: chosen.map((it) => {
        const s = sel[it.orderItemId];
        return { orderItemId: it.orderItemId, qty: s.qty, mode: s.mode, newVariantId: s.mode === "TROCAR" ? s.newVariant?.id : undefined };
      }),
    });
    setBusy(false);
    if (res.ok) { toast(`Registrado: ${res.number}`, "success"); close(); router.refresh(); }
    else toast(res.error ?? "Erro ao processar.", "error");
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary"><Plus size={16} /> Nova troca / devolução</button>
      </div>

      <Modal open={open} onClose={close} title="Troca / devolução" wide>
        <div className="space-y-4">
          {/* Search order */}
          <div>
            <span className={label}>Código da venda</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="field pl-9 font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
                  placeholder="HUX26-V123456 ou HUX26-123456"
                />
              </div>
              <button onClick={lookup} disabled={looking} className="btn btn-light">
                {looking ? <Loader2 size={16} className="animate-spin" /> : <PackageSearch size={16} />} Buscar
              </button>
            </div>
          </div>

          {order && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-line bg-void px-4 py-3 text-sm">
                <div>
                  <span className="font-mono font-semibold">{order.number}</span>
                  <span className="ml-2 text-muted">{order.customerName}</span>
                </div>
                <span className="text-muted">Total da venda: <strong className="text-ink">{formatCents(order.total)}</strong></span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <span className={label}>Itens da venda</span>
                {order.items.map((it) => {
                  const s = sel[it.orderItemId];
                  if (!s) return null;
                  const disabled = it.availableQty <= 0;
                  return (
                    <div key={it.orderItemId} className={cn("rounded-[var(--radius)] border p-3", s.include ? "border-orange/50 bg-orange/5" : "border-line", disabled && "opacity-50")}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-orange"
                          checked={s.include}
                          disabled={disabled}
                          onChange={(e) => update(it.orderItemId, { include: e.target.checked })}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.productName}</p>
                          <p className="font-mono text-xs text-muted">
                            {it.brand} · {it.size}/{it.color} · {formatCents(it.unitPrice)}
                            {" · "}
                            {disabled ? "todas devolvidas" : `${it.availableQty} de ${it.qty} disp.`}
                          </p>
                        </div>
                        {s.include && (
                          <div className="flex items-center rounded-[var(--radius)] border border-line">
                            <button onClick={() => update(it.orderItemId, { qty: Math.max(1, s.qty - 1) })} className="grid size-7 place-items-center text-muted hover:text-ink"><Minus size={13} /></button>
                            <span className="w-7 text-center font-mono text-xs">{s.qty}</span>
                            <button onClick={() => update(it.orderItemId, { qty: Math.min(it.availableQty, s.qty + 1) })} className="grid size-7 place-items-center text-muted hover:text-ink"><Plus size={13} /></button>
                          </div>
                        )}
                      </div>

                      {s.include && (
                        <div className="mt-3 space-y-2 pl-7">
                          {/* mode toggle */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => update(it.orderItemId, { mode: "DEVOLVER", newVariant: null })}
                              className={cn("inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-xs font-medium transition-colors", s.mode === "DEVOLVER" ? "border-negative/50 bg-negative/10 text-negative" : "border-line text-muted hover:border-ink-soft")}
                            >
                              <Undo2 size={13} /> Devolver
                            </button>
                            <button
                              onClick={() => { update(it.orderItemId, { mode: "TROCAR" }); setPickFor(it.orderItemId); setPickSearch(""); }}
                              className={cn("inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-xs font-medium transition-colors", s.mode === "TROCAR" ? "border-info/50 bg-info/10 text-info" : "border-line text-muted hover:border-ink-soft")}
                            >
                              <ArrowLeftRight size={13} /> Trocar
                            </button>
                          </div>

                          {/* exchange target */}
                          {s.mode === "TROCAR" && (
                            <div>
                              {s.newVariant ? (
                                <div className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-info/30 bg-info/5 px-3 py-2 text-sm">
                                  <span className="min-w-0 truncate">→ {s.newVariant.label}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted">{formatCents(s.newVariant.price)}</span>
                                    <button onClick={() => { setPickFor(it.orderItemId); setPickSearch(""); }} className="text-xs text-info hover:underline">trocar</button>
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-faint">Escolha o produto que o cliente vai levar.</p>
                              )}

                              {pickFor === it.orderItemId && (
                                <div className="mt-2">
                                  <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                                    <input autoFocus className="field py-2 pl-9 text-sm" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Buscar produto de troca…" />
                                  </div>
                                  <div className="mt-1 max-h-40 overflow-y-auto rounded-[var(--radius)] border border-line">
                                    {filteredVariants.map((v) => (
                                      <button
                                        key={v.id}
                                        disabled={v.stock <= 0}
                                        onClick={() => { update(it.orderItemId, { newVariant: v }); setPickFor(null); setPickSearch(""); }}
                                        className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-elevated", v.stock <= 0 && "opacity-40")}
                                      >
                                        <span className="min-w-0 truncate">{v.label}</span>
                                        <span className="ml-2 shrink-0 font-mono text-xs text-muted">{v.stock}un · {formatCents(v.price)}</span>
                                      </button>
                                    ))}
                                    {filteredVariants.length === 0 && <p className="p-3 text-center text-sm text-muted">Nada encontrado.</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className="block"><span className={label}>Motivo *</span>
                <textarea className="field min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: tamanho errado, defeito na costura, arrependimento…" />
              </label>

              {/* Summary */}
              {chosen.length > 0 && (
                <div className="space-y-1 rounded-[var(--radius)] border border-line p-3 text-sm">
                  {refund > 0 && (
                    <div className="flex justify-between"><span className="text-muted">Reembolso ao cliente</span><span className="font-semibold text-negative">{formatCents(refund)}</span></div>
                  )}
                  {hasTroca && (
                    <div className="flex justify-between">
                      <span className="text-muted">Diferença da troca</span>
                      <span className={cn("font-semibold", diff >= 0 ? "text-positive" : "text-warning")}>
                        {diff >= 0 ? `+${formatCents(diff)} a cobrar` : `${formatCents(-diff)} a devolver`}
                      </span>
                    </div>
                  )}
                  <p className="pt-1 text-xs text-faint">O estoque é ajustado automaticamente: itens devolvidos voltam, itens de troca saem.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={close} className="btn btn-ghost">Cancelar</button>
                <button onClick={submit} disabled={busy || chosen.length === 0} className="btn btn-primary">
                  {busy && <Loader2 size={16} className="animate-spin" />} Confirmar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
