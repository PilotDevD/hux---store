"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import {
  BRANDS,
  GENDERS,
  GENDER_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  SIZES,
  SIZE_LABELS,
} from "@/lib/enums";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

const brandOpts: Opt[] = BRANDS.map((b) => ({ value: b, label: b }));
const genderOpts: Opt[] = GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }));
const typeOpts: Opt[] = PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] }));
const sizeOpts: Opt[] = SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }));

function Select({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "field cursor-pointer appearance-none py-2.5 pr-9 text-sm font-medium",
          value ? "border-orange/60 text-ink" : "text-ink-soft",
        )}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">▾</span>
    </label>
  );
}

export function StoreFilters({
  collections,
  total,
}: {
  collections: { slug: string; name: string }[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("busca") ?? "");

  const get = (k: string) => params.get(k) ?? "";

  const push = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  // debounce search
  useEffect(() => {
    const current = params.get("busca") ?? "";
    if (search === current) return;
    const t = setTimeout(() => push({ busca: search }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const collectionOpts: Opt[] = collections.map((c) => ({ value: c.slug, label: c.name }));

  const activeCount = ["marca", "genero", "tipo", "tamanho", "colecao", "promo", "busca"].filter(
    (k) => params.get(k),
  ).length;

  const sort = get("ordenar") || "recent";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cor, SKU..."
            className="field py-2.5 pl-9"
            aria-label="Buscar produtos"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              aria-label="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-xs text-faint sm:inline">
            {total} {total === 1 ? "peça" : "peças"}
          </span>
          <label className="relative">
            <span className="sr-only">Ordenar</span>
            <select
              value={sort}
              onChange={(e) => push({ ordenar: e.target.value === "recent" ? "" : e.target.value })}
              className="field cursor-pointer appearance-none py-2.5 pr-9 text-sm font-medium"
              aria-label="Ordenar"
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">▾</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden items-center gap-1.5 text-faint sm:flex">
          <SlidersHorizontal size={15} />
        </span>
        <Select name="marca" label="Marca" value={get("marca")} options={brandOpts} onChange={(v) => push({ marca: v })} />
        <Select name="genero" label="Gênero" value={get("genero")} options={genderOpts} onChange={(v) => push({ genero: v })} />
        <Select name="tipo" label="Tipo" value={get("tipo")} options={typeOpts} onChange={(v) => push({ tipo: v })} />
        <Select name="tamanho" label="Tamanho" value={get("tamanho")} options={sizeOpts} onChange={(v) => push({ tamanho: v })} />
        {collections.length > 0 && (
          <Select name="colecao" label="Coleção" value={get("colecao")} options={collectionOpts} onChange={(v) => push({ colecao: v })} />
        )}
        <button
          onClick={() => push({ promo: get("promo") ? "" : "1" })}
          className={cn(
            "chip transition-colors",
            get("promo") ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft",
          )}
        >
          Em promoção
        </button>
        {activeCount > 0 && (
          <button
            onClick={() =>
              startTransition(() => router.push(pathname, { scroll: false }))
            }
            className="ml-1 inline-flex items-center gap-1 font-mono text-xs text-faint hover:text-negative"
          >
            <X size={13} /> Limpar
          </button>
        )}
        {isPending && <span className="animate-pulse font-mono text-xs text-orange">atualizando…</span>}
      </div>
    </div>
  );
}
