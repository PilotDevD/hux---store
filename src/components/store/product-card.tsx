import Link from "next/link";
import Image from "next/image";
import { formatCents, percentOff } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/enums";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const off = percentOff(product.compareAt, product.price);
  return (
    <Link href={`/produto/${product.slug}`} className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-void">
        {product.image ? (
          <>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              priority={priority}
              className={cn(
                "object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                product.hoverImage && product.hoverImage !== product.image
                  ? "group-hover:opacity-0"
                  : "group-hover:scale-105",
              )}
            />
            {product.hoverImage && product.hoverImage !== product.image && (
              <Image
                src={product.hoverImage}
                alt=""
                fill
                sizes="(max-width:768px) 50vw, 25vw"
                aria-hidden
                className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-faint">HUX</div>
        )}

        {/* tags */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off && (
            <span className="rounded-full bg-orange px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-void">
              -{off}%
            </span>
          )}
          {product.soldOut && (
            <span className="rounded-full bg-void/80 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-muted backdrop-blur">
              Esgotado
            </span>
          )}
        </div>

        {/* size hint on hover */}
        <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex flex-wrap gap-1 rounded-[var(--radius)] border border-line bg-graphite/85 px-3 py-2 backdrop-blur-md">
            {product.sizes.length > 0 ? (
              product.sizes.map((s) => (
                <span key={s} className="font-mono text-[0.66rem] uppercase text-ink-soft">
                  {s === "UNICO" ? "Único" : s}
                </span>
              ))
            ) : (
              <span className="font-mono text-[0.66rem] uppercase text-faint">Indisponível</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="data-label text-faint">
            {product.brand} · {PRODUCT_TYPE_LABELS[product.type as ProductType] ?? product.type}
          </p>
          <h3 className="mt-0.5 truncate font-semibold leading-tight transition-colors group-hover:text-orange">
            {product.name}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold">{formatCents(product.price)}</p>
          {product.compareAt && (
            <p className="text-xs text-faint line-through">{formatCents(product.compareAt)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
