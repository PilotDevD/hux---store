import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection) return { title: "Coleção" };
  return { title: collection.name, description: collection.description ?? undefined };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection || !collection.active) notFound();

  const products = await listProducts({ collection: slug, sort: "recent" });

  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="glow-orange absolute -right-32 -top-24 h-80 w-80 opacity-60" />
        <div className="container-hux relative z-[1] py-14 md:py-20">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-orange" />
            Coleção · {products.length} peças
          </p>
          <h1 className="display-hero text-5xl sm:text-6xl md:text-7xl">{collection.name}</h1>
          {collection.description && (
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{collection.description}</p>
          )}
        </div>
      </header>

      <div className="container-hux py-12">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      </div>
    </>
  );
}
