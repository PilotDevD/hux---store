"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Pencil, Shirt } from "lucide-react";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export type ProductListItem = {
  id: string; name: string; brand: string; typeLabel: string;
  image: string | null; price: number; stock: number; variantsCount: number;
  active: boolean; featured: boolean; supplierCode: string | null; searchText: string;
};

export function ProductsList({ products, sizeFilter }: { products: ProductListItem[]; sizeFilter?: string }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    // Split on spaces so "hux camisa" matches products containing both terms.
    const terms = query.split(/\s+/);
    return products.filter((p) => terms.every((t) => p.searchText.includes(t)));
  }, [q, products]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-[200px] flex-1 md:max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, marca, modelo, SKU…"
            className="field py-2.5 pl-9"
            autoComplete="off"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Limpar"><X size={15} /></button>
          )}
        </div>
        <span className="text-xs text-faint">{filtered.length} de {products.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <div className="grid size-14 place-items-center rounded-full border border-line"><Shirt size={22} className="text-faint" /></div>
          <p className="font-semibold">Nenhum produto encontrado</p>
          <p className="text-sm text-muted">Ajuste a busca ou os filtros.</p>
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {filtered.map((p) => (
            <Link key={p.id} href={`/backoffice/produtos/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-elevated">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-void">
                {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{p.name}</p>
                  {!p.active && <Badge tone="danger">Inativo</Badge>}
                  {p.featured && <Badge tone="warning">Destaque</Badge>}
                </div>
                <p className="font-mono text-xs text-muted">
                  {p.brand} · {p.typeLabel} · {p.variantsCount} variantes{p.supplierCode ? ` · forn. ${p.supplierCode}` : ""}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-semibold">{formatCents(p.price)}</p>
                <p className={`font-mono text-xs ${p.stock <= 3 ? "text-warning" : "text-muted"}`}>{p.stock} un{sizeFilter ? ` ${sizeFilter}` : ""}</p>
              </div>
              <Pencil size={15} className="text-faint" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
