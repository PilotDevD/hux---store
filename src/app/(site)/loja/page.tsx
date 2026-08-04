import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { db } from "@/lib/db";
import { listProducts, type ProductFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { StoreFilters } from "@/components/store/store-filters";

export const metadata: Metadata = {
  title: "Loja",
  description: "Todos os produtos HUX — camisas, regatas, shorts, leggings e mais para correr.",
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LojaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  const filters: ProductFilters = {
    brand: first(sp.marca),
    gender: first(sp.genero),
    type: first(sp.tipo),
    size: first(sp.tamanho),
    collection: first(sp.colecao),
    search: first(sp.busca),
    onlyPromo: first(sp.promo) === "1",
    sort: (first(sp.ordenar) as ProductFilters["sort"]) || "recent",
  };

  const [products, collections] = await Promise.all([
    listProducts(filters),
    db.collection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="glow-orange absolute -right-32 -top-24 h-80 w-80 opacity-70" />
        <div className="container-hux relative z-[1] py-14 md:py-20">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-orange" />
            Catálogo completo
          </p>
          <h1 className="display-hero text-6xl sm:text-7xl md:text-8xl">Loja</h1>
        </div>
      </header>

      <div className="container-hux py-8 md:py-10">
        <StoreFilters collections={collections} total={products.length} />

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
            <div className="grid size-16 place-items-center rounded-full border border-line">
              <PackageOpen size={26} className="text-faint" />
            </div>
            <p className="text-lg font-semibold">Nenhuma peça encontrada</p>
            <p className="max-w-sm text-sm text-muted">
              Tente ajustar os filtros ou limpar a busca para ver todo o catálogo.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
