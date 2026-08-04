import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { PRODUCT_TYPE_LABELS, GENDER_LABELS, type ProductType, type Gender } from "@/lib/enums";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyPanel } from "@/components/store/product-buy-panel";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/site/section-heading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.brand, product.id, 4);
  const specs = (product.details ?? "").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="container-hux py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex flex-wrap items-center gap-1.5 font-mono text-xs text-faint">
        <Link href="/loja" className="hover:text-orange">Loja</Link>
        <ChevronRight size={13} />
        <Link href={`/loja?marca=${product.brand}`} className="hover:text-orange">{product.brand}</Link>
        <ChevronRight size={13} />
        <span className="text-muted">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <p className="data-label mb-2 text-orange">
            {product.brand} · {PRODUCT_TYPE_LABELS[product.type as ProductType] ?? product.type}
            {" · "}
            {GENDER_LABELS[product.gender as Gender] ?? product.gender}
          </p>
          <h1 className="headline text-4xl md:text-5xl">{product.name}</h1>
          {product.modelName && (
            <p className="mt-2 font-mono text-sm text-muted">Modelo {product.modelName}</p>
          )}
          {product.promotionName && (
            <span className="chip mt-4 border-orange/50 bg-orange/10 text-orange">
              {product.promotionName}
            </span>
          )}

          {product.description && (
            <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">{product.description}</p>
          )}

          <div className="mt-8">
            <ProductBuyPanel product={product} />
          </div>

          <div className="mt-6">
            <ShippingCalculator subtotalCents={product.price} />
          </div>

          {/* trust row */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6">
            {[
              { icon: Truck, t: "Envio para todo o Brasil" },
              { icon: RotateCcw, t: "Troca em até 30 dias" },
              { icon: ShieldCheck, t: "Pagamento via Pix" },
            ].map((f) => (
              <div key={f.t} className="flex flex-col items-center gap-2 text-center">
                <f.icon size={20} className="text-orange" />
                <span className="text-[0.7rem] leading-tight text-muted">{f.t}</span>
              </div>
            ))}
          </div>

          {/* specs */}
          {specs.length > 0 && (
            <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
              <p className="eyebrow mb-4">Especificações</p>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeading eyebrow={`Mais de ${product.brand}`} title="Você também vai gostar" />
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
