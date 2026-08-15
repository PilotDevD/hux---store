"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Receipt, Search, X, Minus } from "lucide-react";
import { createManualSaleAction } from "@/app/actions/backoffice-vendas";
import { Modal } from "./modal";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/enums";

export type VariantOption = { id: string; label: string; stock: number; price: number };
export type SaleRow = { number: string; customerName: string; sellerName: string; total: number; paymentMethod: string; createdAt: string };

export function VendasManager({
  variants, sellers, sales,
}: {
  variants: VariantOption[];
  sellers: { id: string; name: string }[];
  sales: SaleRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [customerName, setCustomerName] = useState("Cliente balcão");
  const [customerPhone, setCustomerPhone] = useState("");
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [method, setMethod] = useState<string>("DINHEIRO");
  const [installments, setInstallments] = useState("1");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<{ v: VariantOption; qty: number }[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (q ? variants.filter((v) => v.label.toLowerCase().includes(q)) : variants).slice(0, 25);
  }, [search, variants]);

  const subtotal = cart.reduce((s, x) => s + x.v.price * x.qty, 0);

  function add(v: VariantOption) { setCart((c) => (c.some((x) => x.v.id === v.id) ? c : [...c, { v, qty: 1 }])); setSearch(""); }
  function setQty(id: string, qty: number) { setCart((c) => c.map((x) => (x.v.id === id ? { ...x, qty: Math.max(1, Math.min(x.v.stock, qty)) } : x))); }
  function reset() { setCustomerName("Cliente balcão"); setCustomerPhone(""); setMethod("DINHEIRO"); setInstallments("1"); setDiscount(""); setNote(""); setCart([]); setSearch(""); }

  async function save() {
    if (cart.length === 0) return toast("Adicione ao menos um item.", "error");
    setBusy(true);
    const res = await createManualSaleAction({
      customerName, customerPhone, sellerId, paymentMethod: method as never,
      cardInstallments: method === "CARTAO" ? Number(installments) || 1 : undefined,
      discount, note, items: cart.map((x) => ({ variantId: x.v.id, qty: x.qty })),
    });
    setBusy(false);
    if (res.ok) { toast(`Venda ${res.number} registrada!`, "success"); setOpen(false); reset(); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary"><Plus size={16} /> Nova venda física</button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3"><p className="eyebrow">Vendas físicas recentes</p></div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="grid size-12 place-items-center rounded-full border border-line"><Receipt size={20} className="text-faint" /></div>
            <p className="text-sm text-muted">Nenhuma venda física registrada ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {sales.map((s) => (
              <div key={s.number} className="grid grid-cols-2 items-center gap-3 px-5 py-3 md:grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_auto]">
                <span className="font-mono text-sm font-semibold">{s.number}</span>
                <span className="truncate text-sm text-ink-soft">{s.customerName}</span>
                <span className="hidden text-sm text-muted md:block">{s.sellerName}</span>
                <span className="hidden text-sm text-muted md:block">{PAYMENT_METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}</span>
                <span className="text-sm font-semibold">{formatCents(s.total)}</span>
                <Link href={`/backoffice/recibo/${s.number}`} target="_blank" className="justify-self-end text-xs text-orange hover:underline">recibo</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova venda física" wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Cliente</span><input className="field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
            <label><span className={label}>Telefone</span><input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" /></label>
            <label><span className={label}>Vendedor</span>
              <select className="field" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
                {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label><span className={label}>Forma de pagamento</span>
              <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
                {MANUAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
            </label>
            {method === "CARTAO" && (
              <label><span className={label}>Parcelas (crédito)</span>
                <select className="field" value={installments} onChange={(e) => setInstallments(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                </select>
              </label>
            )}
            <label><span className={label}>Desconto (R$)</span><input className="field" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" inputMode="decimal" /></label>
          </div>

          <div>
            <span className={label}>Itens *</span>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input className="field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, tamanho, cor, SKU..." />
            </div>
            {search && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-[var(--radius)] border border-line">
                {filtered.map((v) => (
                  <button key={v.id} onClick={() => add(v)} disabled={v.stock <= 0} className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-elevated", v.stock <= 0 && "opacity-40")}>
                    <span>{v.label}</span><span className="font-mono text-xs text-muted">{v.stock}un · {formatCents(v.price)}</span>
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
                  <span className="text-muted">{formatCents(x.v.price * x.qty)}</span>
                  <div className="flex items-center rounded-[var(--radius)] border border-line">
                    <button onClick={() => setQty(x.v.id, x.qty - 1)} className="grid size-7 place-items-center text-muted hover:text-ink"><Minus size={13} /></button>
                    <span className="w-7 text-center font-mono text-xs">{x.qty}</span>
                    <button onClick={() => setQty(x.v.id, x.qty + 1)} className="grid size-7 place-items-center text-muted hover:text-ink"><Plus size={13} /></button>
                  </div>
                  <button onClick={() => setCart((c) => c.filter((y) => y.v.id !== x.v.id))} className="text-faint hover:text-negative"><X size={15} /></button>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-sm font-semibold">
                <span>Subtotal</span><span>{formatCents(subtotal)}</span>
              </div>
            </div>
          )}
          <label className="block"><span className={label}>Observação</span><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Registrar venda</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
