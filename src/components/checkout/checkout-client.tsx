"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Plus, Tag, Loader2, ShieldCheck, QrCode, Check, ChevronLeft, X,
  Barcode, CreditCard,
} from "lucide-react";
import type { CartDetailed } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { getCheckoutSummary, placeOrderAction, type CheckoutSummary } from "@/app/actions/checkout";
import { AddressForm } from "./address-form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Address = {
  id: string; label: string; recipient: string; cep: string; street: string;
  number: string; complement: string | null; district: string; city: string;
  state: string; isDefault: boolean;
};

export function CheckoutClient({
  customer,
  cart,
  addresses,
}: {
  customer: { name: string; email: string; phone: string | null };
  cart: CartDetailed;
  addresses: Address[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState<"PIX_MANUAL" | "BOLETO">("PIX_MANUAL");
  const [parcelas, setParcelas] = useState(1);

  // Recompute summary whenever address or applied coupon changes.
  useEffect(() => {
    let alive = true;
    setLoadingSummary(true);
    getCheckoutSummary(selectedId, appliedCoupon).then((s) => {
      if (!alive) return;
      setSummary(s);
      setLoadingSummary(false);
      if (s.couponError) {
        toast(s.couponError, "error");
        setAppliedCoupon(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [selectedId, appliedCoupon, toast]);

  function applyCoupon() {
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
  }
  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
  }

  async function place() {
    if (!selectedId) {
      toast("Selecione ou cadastre um endereço de entrega.", "error");
      return;
    }
    setPlacing(true);
    const res = await placeOrderAction({
      addressId: selectedId,
      couponCode: appliedCoupon,
      note,
      paymentMethod: payMethod,
      boletoParcelas: payMethod === "BOLETO" ? parcelas : undefined,
    });
    if (res.ok && res.number) {
      router.push(`/checkout/sucesso/${res.number}`);
    } else {
      setPlacing(false);
      toast(res.error ?? "Não foi possível finalizar o pedido.", "error");
    }
  }

  const shippingLine = summary?.shipping
    ? summary.freeShipping || summary.shipping.free
      ? "Grátis"
      : formatCents(summary.shipping.price)
    : "—";

  return (
    <div className="container-hux py-8 md:py-12">
      <Link href="/loja" className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Continuar comprando
      </Link>
      <h1 className="headline mb-8 text-4xl md:text-5xl">Finalizar compra</h1>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* ------------------------- LEFT ------------------------- */}
        <div className="space-y-8">
          {/* Contact */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold uppercase tracking-wide">
              <span className="grid size-6 place-items-center rounded-full bg-orange font-mono text-xs text-void">1</span>
              Contato
            </h2>
            <div className="card p-4 text-sm">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-muted">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
            </div>
          </section>

          {/* Address */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold uppercase tracking-wide">
              <span className="grid size-6 place-items-center rounded-full bg-orange font-mono text-xs text-void">2</span>
              Entrega
            </h2>

            {addresses.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
                      selectedId === a.id ? "border-orange bg-orange/5" : "border-line hover:border-ink-soft",
                    )}
                  >
                    <MapPin size={18} className={cn("mt-0.5 shrink-0", selectedId === a.id ? "text-orange" : "text-faint")} />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">{a.label} {a.isDefault && <span className="text-faint">· padrão</span>}</p>
                      <p className="text-muted">{a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ""}</p>
                      <p className="text-muted">{a.district} — {a.city}/{a.state} · {a.cep}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showForm ? (
              <div className="mt-4 card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="data-label text-muted">Novo endereço</p>
                  {addresses.length > 0 && (
                    <button onClick={() => setShowForm(false)} className="text-faint hover:text-ink"><X size={16} /></button>
                  )}
                </div>
                <AddressForm
                  defaultRecipient={customer.name}
                  onCreated={(id) => {
                    setSelectedId(id);
                    setShowForm(false);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange hover:underline">
                <Plus size={16} /> Adicionar novo endereço
              </button>
            )}
          </section>

          {/* Payment */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold uppercase tracking-wide">
              <span className="grid size-6 place-items-center rounded-full bg-orange font-mono text-xs text-void">3</span>
              Pagamento
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayMethod("PIX_MANUAL")}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
                  payMethod === "PIX_MANUAL" ? "border-orange bg-orange/5" : "border-line hover:border-ink-soft",
                )}
              >
                <QrCode size={22} className={payMethod === "PIX_MANUAL" ? "text-orange" : "text-faint"} />
                <div>
                  <p className="font-semibold">Pix</p>
                  <p className="text-xs text-muted">QR Code / copia-e-cola. Aprovação na hora.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPayMethod("BOLETO")}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
                  payMethod === "BOLETO" ? "border-orange bg-orange/5" : "border-line hover:border-ink-soft",
                )}
              >
                <Barcode size={22} className={payMethod === "BOLETO" ? "text-orange" : "text-faint"} />
                <div>
                  <p className="font-semibold">Boleto bancário</p>
                  <p className="text-xs text-muted">Em até 3x. Vence em alguns dias.</p>
                </div>
              </button>
              <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-line p-4 opacity-50 sm:col-span-2" title="Em breve via PagSeguro">
                <CreditCard size={22} className="text-faint" />
                <div>
                  <p className="font-semibold">Cartão de crédito <span className="text-faint">· em breve</span></p>
                  <p className="text-xs text-muted">Será habilitado com a integração PagSeguro.</p>
                </div>
              </div>
            </div>

            {payMethod === "BOLETO" && (
              <div className="mt-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
                <p className="data-label mb-2.5 text-muted">Parcelas do boleto</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((n) => {
                    const total = summary?.total ?? cart.subtotal;
                    const per = Math.floor(total / n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setParcelas(n)}
                        className={cn(
                          "flex-1 rounded-[var(--radius)] border px-3 py-2.5 text-center transition-colors",
                          parcelas === n ? "border-orange bg-orange/10 text-orange" : "border-line text-ink-soft hover:border-ink",
                        )}
                      >
                        <span className="block text-sm font-bold">{n}x</span>
                        <span className="block text-xs text-muted">{formatCents(per)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-faint">
                  {parcelas === 1
                    ? "Boleto à vista, vencimento em ~3 dias."
                    : `${parcelas} boletos, um por mês (o 1º vence em ~3 dias).`}
                </p>
              </div>
            )}
            <label className="mt-3 block">
              <span className="data-label mb-1.5 block text-muted">Observação do pedido (opcional)</span>
              <textarea className="field min-h-20 resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: entregar no período da tarde" />
            </label>
          </section>
        </div>

        {/* ------------------------- RIGHT (summary) ------------------------- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="headline text-xl">Resumo</h2>
            </div>

            <ul className="max-h-72 space-y-3 overflow-y-auto px-5 py-4">
              {cart.lines.map((l) => (
                <li key={l.itemId} className="flex gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-void">
                    {l.image && <Image src={l.image} alt={l.name} fill sizes="56px" className="object-cover" />}
                    <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-elevated px-1 font-mono text-[0.6rem] text-ink-soft">
                      {l.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-xs text-muted">
                      {PRODUCT_TYPE_LABELS[l.type as ProductType] ?? l.type} · {SIZE_LABELS[l.size as Size] ?? l.size} · {l.color}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{formatCents(l.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="border-y border-line px-5 py-4">
              {appliedCoupon && !summary?.couponError ? (
                <div className="flex items-center justify-between rounded-[var(--radius)] border border-positive/40 bg-positive/10 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-positive">
                    <Tag size={14} /> {appliedCoupon} aplicado
                  </span>
                  <button onClick={removeCoupon} className="text-positive/70 hover:text-positive"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="Cupom de desconto"
                    className="field py-2.5"
                  />
                  <button onClick={applyCoupon} className="btn btn-ghost shrink-0 px-4">Aplicar</button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2.5 px-5 py-4 text-sm">
              <Row label="Subtotal" value={formatCents(cart.subtotal)} />
              {summary && summary.discountTotal > 0 && (
                <Row label="Desconto" value={`- ${formatCents(summary.discountTotal)}`} tone="positive" />
              )}
              <Row
                label={summary?.shipping ? `Frete · ${summary.shipping.name}` : "Frete"}
                value={
                  loadingSummary ? "…" : selectedId ? shippingLine : "informe o endereço"
                }
                tone={summary?.freeShipping || summary?.shipping?.free ? "positive" : undefined}
              />
              <div className="mt-2 flex items-end justify-between border-t border-line pt-3">
                <span className="text-base font-semibold uppercase">Total</span>
                <span className="font-display text-3xl text-orange">
                  {loadingSummary ? <Loader2 size={20} className="animate-spin" /> : formatCents(summary?.total ?? cart.subtotal)}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button onClick={place} disabled={placing || loadingSummary || !selectedId} className="btn btn-primary w-full">
                {placing ? <><Loader2 size={16} className="animate-spin" /> Gerando pedido…</> : <><Check size={16} /> {payMethod === "BOLETO" ? "Finalizar e gerar boleto" : "Finalizar e gerar Pix"}</>}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
                <ShieldCheck size={13} /> Compra protegida · dados criptografados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "positive" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("font-medium", tone === "positive" && "text-positive")}>{value}</span>
    </div>
  );
}
