"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Check, Zap, BellRing, Loader2 } from "lucide-react";
import type { ProductDetail } from "@/lib/catalog";
import { requestBackInStockAction } from "@/app/actions/store-notify";
import { formatCents, percentOff } from "@/lib/money";
import { SIZE_LABELS, type Size } from "@/lib/enums";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ProductBuyPanel({ product }: { product: ProductDetail }) {
  const { add } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const sizesForColor = useMemo(
    () => product.variants.filter((v) => v.color === color),
    [product.variants, color],
  );
  const firstAvailable = sizesForColor.find((v) => v.stock > 0)?.size ?? sizesForColor[0]?.size ?? "";
  const [size, setSize] = useState(firstAvailable);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  // keep size valid when color changes
  const variant = useMemo(
    () => product.variants.find((v) => v.color === color && v.size === size) ?? null,
    [product.variants, color, size],
  );

  const onColor = (c: string) => {
    setColor(c);
    const avail = product.variants.find((v) => v.color === c && v.stock > 0);
    setSize(avail?.size ?? product.variants.find((v) => v.color === c)?.size ?? "");
    setQty(1);
  };

  const off = percentOff(product.compareAt, variant?.price ?? product.price);
  const stock = variant?.stock ?? 0;
  const unavailable = !variant || stock <= 0;

  async function handleAdd(openDrawer = true): Promise<boolean> {
    if (!variant) {
      toast("Selecione um tamanho.", "error");
      return false;
    }
    if (stock <= 0) {
      toast("Tamanho esgotado.", "error");
      return false;
    }
    setBusy(true);
    const ok = await add(variant.id, qty, { openDrawer });
    setBusy(false);
    if (ok && openDrawer) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
    return ok;
  }

  async function buyNow() {
    const ok = await handleAdd(false);
    if (ok) router.push("/checkout");
  }

  async function notifyMe() {
    if (!/.+@.+\..+/.test(notifyEmail)) return toast("Informe um e-mail válido.", "error");
    setNotifyBusy(true);
    const res = await requestBackInStockAction({
      productId: product.id,
      variantId: variant?.id,
      email: notifyEmail,
      size: variant?.size,
      color,
    });
    setNotifyBusy(false);
    if (res.ok) { setNotifySent(true); toast("Pronto! Avisaremos assim que voltar.", "success"); }
    else toast(res.error ?? "Erro.", "error");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-end gap-3">
          <span className="font-display text-4xl text-ink">
            {formatCents(variant?.price ?? product.price)}
          </span>
          {product.compareAt && (
            <span className="pb-1 text-lg text-faint line-through">
              {formatCents(product.compareAt)}
            </span>
          )}
          {off && (
            <span className="mb-1.5 rounded-full bg-orange px-2 py-0.5 font-mono text-[0.62rem] font-bold text-void">
              -{off}%
            </span>
          )}
        </div>
        <p className="mt-1.5 font-mono text-xs text-muted">
          ou 3x de {formatCents(Math.round((variant?.price ?? product.price) / 3))} sem juros
        </p>
      </div>

      {/* Color */}
      {product.colors.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="data-label text-muted">Cor</span>
            <span className="text-sm text-ink-soft">{color}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={() => onColor(c.name)}
                aria-label={c.name}
                title={c.name}
                className={cn(
                  "relative size-9 rounded-full border-2 transition-transform hover:scale-110",
                  color === c.name ? "border-orange" : "border-line",
                )}
                style={{ background: c.hex ?? "#333" }}
              >
                {color === c.name && (
                  <Check size={14} className="absolute inset-0 m-auto text-white mix-blend-difference" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="data-label text-muted">Tamanho</span>
          <button className="text-xs text-muted underline-offset-2 hover:text-orange hover:underline">
            Guia de medidas
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizesForColor.map((v) => {
            const out = v.stock <= 0;
            return (
              <button
                key={v.id}
                onClick={() => !out && setSize(v.size)}
                disabled={out}
                className={cn(
                  "min-w-[3rem] rounded-[var(--radius)] border px-3 py-2.5 text-sm font-semibold uppercase transition-colors",
                  v.size === size
                    ? "border-orange bg-orange text-void"
                    : out
                      ? "cursor-not-allowed border-line/60 text-faint line-through"
                      : "border-line text-ink-soft hover:border-ink",
                )}
              >
                {SIZE_LABELS[v.size as Size] ?? v.size}
              </button>
            );
          })}
        </div>
        {variant && stock > 0 && stock <= 3 && (
          <p className="mt-2 font-mono text-xs text-warning">Últimas {stock} unidades!</p>
        )}
      </div>

      {/* Qty + add */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-[var(--radius)] border border-line">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid size-11 place-items-center text-muted hover:text-ink"
              aria-label="Diminuir"
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center font-mono">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}
              disabled={qty >= stock}
              className="grid size-11 place-items-center text-muted hover:text-ink disabled:opacity-40"
              aria-label="Aumentar"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={() => handleAdd(true)}
            disabled={busy || unavailable}
            className="btn btn-primary flex-1"
          >
            {added ? (
              <>
                <Check size={16} /> Adicionado
              </>
            ) : unavailable ? (
              "Esgotado"
            ) : (
              <>
                <ShoppingBag size={16} /> Adicionar à sacola
              </>
            )}
          </button>
        </div>
        {!unavailable && (
          <button onClick={buyNow} disabled={busy} className="btn btn-light w-full">
            <Zap size={16} /> Comprar agora
          </button>
        )}
      </div>

      {/* Avise-me quando voltar */}
      {unavailable && (
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <p className="flex items-center gap-2 font-semibold"><BellRing size={16} className="text-orange" /> Esgotado nesse tamanho/cor</p>
          {notifySent ? (
            <p className="mt-2 text-sm text-positive">✓ Avisaremos <strong>{notifyEmail}</strong> assim que voltar ao estoque.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Deixe seu e-mail que avisamos quando voltar.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="field"
                />
                <button onClick={notifyMe} disabled={notifyBusy} className="btn btn-primary shrink-0">
                  {notifyBusy ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />} Avise-me
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
