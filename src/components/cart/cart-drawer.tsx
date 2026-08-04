"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "./cart-provider";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { cart, open, setOpen, update, remove, pending } = useCart();
  const lines = cart?.lines ?? [];

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[150] bg-void/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[151] flex h-full w-[min(92vw,440px)] flex-col border-l border-line bg-graphite transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label="Carrinho"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-orange" />
            <h2 className="headline text-lg">Sacola</h2>
            <span className="data-label text-faint">
              [{cart?.count ?? 0}]
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid size-16 place-items-center rounded-full border border-line">
              <ShoppingBag size={24} className="text-faint" />
            </div>
            <p className="text-muted">Sua sacola está vazia.</p>
            <Link href="/loja" onClick={() => setOpen(false)} className="btn btn-ghost mt-2">
              Explorar a loja
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col divide-y divide-line">
                {lines.map((l) => (
                  <li key={l.itemId} className="flex gap-3.5 py-4">
                    <Link
                      href={`/produto/${l.slug}`}
                      onClick={() => setOpen(false)}
                      className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-void"
                    >
                      {l.image ? (
                        <Image src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-faint">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="data-label text-faint">{l.brand}</p>
                          <Link
                            href={`/produto/${l.slug}`}
                            onClick={() => setOpen(false)}
                            className="line-clamp-1 font-semibold leading-tight hover:text-orange"
                          >
                            {l.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted">
                            {PRODUCT_TYPE_LABELS[l.type as ProductType] ?? l.type} ·{" "}
                            {SIZE_LABELS[l.size as Size] ?? l.size} · {l.color}
                          </p>
                        </div>
                        <button
                          onClick={() => remove(l.variantId)}
                          className="shrink-0 text-faint transition-colors hover:text-negative"
                          aria-label="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-[var(--radius)] border border-line">
                          <button
                            onClick={() => update(l.variantId, l.qty - 1)}
                            disabled={pending}
                            className="grid size-8 place-items-center text-muted hover:text-ink disabled:opacity-40"
                            aria-label="Diminuir"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-mono text-sm">{l.qty}</span>
                          <button
                            onClick={() => update(l.variantId, l.qty + 1)}
                            disabled={pending || l.qty >= l.maxStock}
                            className="grid size-8 place-items-center text-muted hover:text-ink disabled:opacity-40"
                            aria-label="Aumentar"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCents(l.lineTotal)}</p>
                          {l.compareAt && (
                            <p className="text-xs text-faint line-through">
                              {formatCents(l.compareAt * l.qty)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-line px-5 py-4">
              <div className="mb-3">
                <ShippingCalculator subtotalCents={cart?.subtotal ?? 0} compact />
              </div>
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Subtotal</span>
                <span className="font-display text-2xl">{formatCents(cart?.subtotal ?? 0)}</span>
              </div>
              <p className="mb-3 text-xs text-muted">
                Cupom aplicado no checkout.
              </p>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary w-full">
                Finalizar compra <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 w-full text-center text-xs text-muted transition-colors hover:text-ink"
              >
                Continuar comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
