"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Bookmark, Check, X, Search } from "lucide-react";
import {
  createReservationAction, closeReservationAction, cancelReservationAction, markReservationPaidAction,
} from "@/app/actions/backoffice-reservas";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { CustomerAutocomplete, type CustomerLite } from "./customer-autocomplete";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
import { MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/enums";

export type VariantOption = {
  id: string; label: string; brand: string; stock: number; price: number; search?: string;
};
export type ReservationItemRow = { productName: string; brand: string; size: string; color: string; qty: number; unitPrice: number };
export type ReservationRow = {
  id: string; productName: string; brand: string; size: string; color: string;
  qty: number; unitPrice: number; customerName: string; customerPhone: string | null;
  notes: string | null; status: string; orderNumber: string | null; createdAt: string;
  paid: boolean; paidMethod: string | null;
  items: ReservationItemRow[]; total: number;
};

export function ReservasManager({
  reservations,
  variants,
  customers,
}: {
  reservations: ReservationRow[];
  variants: VariantOption[];
  customers: CustomerLite[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<{ v: VariantOption; qty: number }[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return variants.slice(0, 30);
    const q = search.toLowerCase();
    return variants.filter((v) => (v.search ?? v.label).toLowerCase().includes(q)).slice(0, 30);
  }, [search, variants]);

  const addToCart = (v: VariantOption) => { setCart((c) => (c.some((x) => x.v.id === v.id) ? c : [...c, { v, qty: 1 }])); setSearch(""); };
  const setCartQty = (id: string, q: number) => setCart((c) => c.map((x) => (x.v.id === id ? { ...x, qty: Math.max(1, Math.min(x.v.stock, q)) } : x)));
  const removeFromCart = (id: string) => setCart((c) => c.filter((x) => x.v.id !== id));
  const cartTotal = cart.reduce((s, x) => s + x.v.price * x.qty, 0);

  function reset() {
    setCart([]); setSearch(""); setCustomerName(""); setCustomerPhone(""); setNotes("");
  }

  async function create() {
    if (cart.length === 0) return toast("Adicione ao menos um produto.", "error");
    if (!customerName.trim()) return toast("Informe o cliente.", "error");
    setBusy(true);
    const res = await createReservationAction({ items: cart.map((x) => ({ variantId: x.v.id, qty: x.qty })), customerName, customerPhone, notes });
    setBusy(false);
    if (res.ok) { toast("Reserva criada. Estoque provisionado.", "success"); setOpen(false); reset(); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const [rowBusy, setRowBusy] = useState<string | null>(null);
  // Qual linha está com o seletor de forma de pagamento aberto, e para qual ação.
  const [payFor, setPayFor] = useState<{ id: string; mode: "fechar" | "pagar" } | null>(null);
  const [payMethod, setPayMethod] = useState("DINHEIRO");

  async function fechar(id: string, method?: string) {
    setRowBusy(id);
    const res = await closeReservationAction(id, method);
    setRowBusy(null);
    if (res.ok) { toast(`Venda fechada! Pedido ${res.number}.`, "success"); setPayFor(null); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function registrarPagamento(id: string, method: string) {
    setRowBusy(id);
    const res = await markReservationPaidAction(id, method);
    setRowBusy(null);
    if (res.ok) { toast("Pagamento registrado. Aguardando retirada.", "success"); setPayFor(null); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  function openPay(id: string, mode: "fechar" | "pagar") {
    setPayFor({ id, mode }); setPayMethod("DINHEIRO");
  }
  function confirmPay() {
    if (!payFor) return;
    if (payFor.mode === "pagar") registrarPagamento(payFor.id, payMethod);
    else fechar(payFor.id, payMethod);
  }
  async function cancelar(id: string) {
    setRowBusy(id);
    const res = await cancelReservationAction(id);
    setRowBusy(null);
    if (res.ok) { toast("Reserva cancelada. Estoque devolvido.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary"><Plus size={16} /> Nova reserva</button>
      </div>

      {reservations.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nenhuma reserva" hint="Reserve uma peça do estoque para um cliente e feche a venda com um clique." />
      ) : (
        <div className="card divide-y divide-line">
          {reservations.map((r) => {
            const active = r.status === "ATIVA";
            return (
              <div key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">
                        {r.items.length > 1 ? `${r.items.length} produtos` : r.productName}
                      </p>
                      <Badge tone={active ? "warning" : r.status === "FINALIZADA" ? "success" : "neutral"}>
                        {r.status === "ATIVA" ? "Reservada" : r.status === "FINALIZADA" ? "Vendida" : "Cancelada"}
                      </Badge>
                      {active && (
                        <Badge tone={r.paid ? "success" : "neutral"}>
                          {r.paid ? `Pago${r.paidMethod ? ` · ${PAYMENT_METHOD_LABELS[r.paidMethod] ?? r.paidMethod}` : ""} · aguardando retirada` : "Não pago"}
                        </Badge>
                      )}
                    </div>
                    {r.items.length > 1 ? (
                      <ul className="mt-0.5 font-mono text-xs text-muted">
                        {r.items.map((it, idx) => (
                          <li key={idx}>• {it.qty}x {it.productName} ({it.size}/{it.color}) · {formatCents(it.unitPrice * it.qty)}</li>
                        ))}
                        <li className="mt-0.5 text-ink-soft">Total: {formatCents(r.total)}</li>
                      </ul>
                    ) : (
                      <p className="font-mono text-xs text-muted">
                        {r.brand} · {r.size} · {r.color} · {r.qty}x · {formatCents(r.total)}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      {r.customerName}{r.customerPhone ? ` · ${r.customerPhone}` : ""} · {formatDate(r.createdAt)}
                      {r.orderNumber ? ` · pedido ${r.orderNumber}` : ""}
                    </p>
                    {r.notes && <p className="mt-1 text-xs text-ink-soft"><span className="text-faint">Obs.:</span> {r.notes}</p>}
                  </div>
                  {active && (
                    <div className="flex flex-wrap gap-2">
                      {!r.paid && (
                        <button onClick={() => openPay(r.id, "pagar")} disabled={rowBusy === r.id} className="btn btn-ghost px-3 py-2 text-xs text-positive">
                          Registrar pagamento
                        </button>
                      )}
                      <button onClick={() => (r.paid ? fechar(r.id) : openPay(r.id, "fechar"))} disabled={rowBusy === r.id} className="btn btn-primary px-3 py-2 text-xs">
                        {rowBusy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {r.paid ? "Fechar venda (retirada)" : "Fechar venda"}
                      </button>
                      <button onClick={() => cancelar(r.id)} disabled={rowBusy === r.id} className="btn btn-ghost px-3 py-2 text-xs text-negative">
                        <X size={13} /> Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {active && payFor?.id === r.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-void p-3">
                    <span className="text-xs text-muted">
                      {payFor.mode === "pagar" ? "Forma de pagamento (pago agora, retira depois):" : "Fechar venda — forma de pagamento:"}
                    </span>
                    <select className="field w-44 py-2 text-sm" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {MANUAL_PAYMENT_METHODS.filter((m) => m !== "A_PRAZO").map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</option>)}
                    </select>
                    <button onClick={confirmPay} disabled={rowBusy === r.id} className="btn btn-primary px-3 py-2 text-xs">
                      {rowBusy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirmar
                    </button>
                    <button onClick={() => setPayFor(null)} className="text-faint hover:text-ink"><X size={15} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova reserva" wide>
        <div className="space-y-4">
          <div>
            <span className={label}>Produtos (pode reservar vários) *</span>
            {/* Itens já no carrinho da reserva */}
            {cart.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {cart.map((x) => (
                  <div key={x.v.id} className="flex items-center gap-2 rounded-[var(--radius)] border border-orange/40 bg-orange/5 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{x.v.label}</span>
                    <div className="flex items-center rounded border border-line">
                      <button onClick={() => setCartQty(x.v.id, x.qty - 1)} className="px-2 py-1 text-muted hover:text-ink">−</button>
                      <span className="w-8 text-center font-mono text-xs">{x.qty}</span>
                      <button onClick={() => setCartQty(x.v.id, x.qty + 1)} disabled={x.qty >= x.v.stock} className="px-2 py-1 text-muted hover:text-ink disabled:opacity-40">+</button>
                    </div>
                    <span className="w-20 text-right font-mono text-xs text-muted">{formatCents(x.v.price * x.qty)}</span>
                    <button onClick={() => removeFromCart(x.v.id)} className="text-faint hover:text-negative"><X size={14} /></button>
                  </div>
                ))}
                <div className="flex justify-end px-1 text-xs text-muted">Total: <strong className="ml-1 text-ink">{formatCents(cartTotal)}</strong></div>
              </div>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input className="field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, tamanho, cor, SKU..." />
            </div>
            {search.trim() && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-[var(--radius)] border border-line">
                {filtered.map((v) => {
                  const inCart = cart.some((x) => x.v.id === v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => addToCart(v)}
                      disabled={v.stock <= 0 || inCart}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-elevated",
                        (v.stock <= 0 || inCart) && "opacity-40",
                      )}
                    >
                      <span>{v.label}{inCart ? " · já adicionado" : ""}</span>
                      <span className={cn("font-mono text-xs", v.stock <= 3 ? "text-warning" : "text-muted")}>{v.stock} un</span>
                    </button>
                  );
                })}
                {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted">Nada encontrado.</p>}
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div><span className={label}>Cliente *</span>
              <CustomerAutocomplete
                customers={customers}
                name={customerName}
                onName={setCustomerName}
                onPick={(c) => { setCustomerName(c.name); if (c.phone) setCustomerPhone(c.phone); }}
              />
            </div>
          </div>
          <label className="block"><span className={label}>Telefone (WhatsApp)</span>
            <input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </label>
          <label className="block"><span className={label}>Observações</span>
            <textarea className="field min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: separar até sexta, cliente confirmou por WhatsApp" />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={create} disabled={busy} className="btn btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />} Reservar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
