"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelect = {
  param: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Reusable backoffice filter bar. Syncs a debounced search box, any number of
 * dropdown filters, and an optional date range to the URL query string.
 */
export function BoFilterBar({
  searchParam = "q",
  searchPlaceholder = "Buscar…",
  selects = [],
  dateRange = false,
}: {
  searchParam?: string;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  dateRange?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(params.get(searchParam) ?? "");

  const get = (k: string) => params.get(k) ?? "";

  const push = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  useEffect(() => {
    const cur = params.get(searchParam) ?? "";
    if (search === cur) return;
    const t = setTimeout(() => push({ [searchParam]: search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeKeys = [
    ...selects.map((s) => s.param),
    ...(dateRange ? ["de", "ate"] : []),
    searchParam,
  ];
  const activeCount = activeKeys.filter((k) => params.get(k)).length;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 md:max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="field py-2.5 pl-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Limpar">
            <X size={15} />
          </button>
        )}
      </div>

      <span className="hidden text-faint sm:inline"><SlidersHorizontal size={15} /></span>

      {selects.map((sel) => (
        <label key={sel.param} className="relative">
          <span className="sr-only">{sel.label}</span>
          <select
            value={get(sel.param)}
            onChange={(e) => push({ [sel.param]: e.target.value })}
            className={cn("field cursor-pointer appearance-none py-2.5 pr-9 text-sm font-medium", get(sel.param) ? "border-orange/60 text-ink" : "text-ink-soft")}
          >
            <option value="">{sel.label}</option>
            {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">▾</span>
        </label>
      ))}

      {dateRange && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={get("de")} onChange={(e) => push({ de: e.target.value })} className="field py-2 text-sm" aria-label="De" />
          <span className="text-faint">→</span>
          <input type="date" value={get("ate")} onChange={(e) => push({ ate: e.target.value })} className="field py-2 text-sm" aria-label="Até" />
        </div>
      )}

      {activeCount > 0 && (
        <button onClick={() => start(() => router.push(pathname, { scroll: false }))} className="inline-flex items-center gap-1 font-mono text-xs text-faint hover:text-negative">
          <X size={13} /> Limpar
        </button>
      )}
      {pending && <span className="animate-pulse font-mono text-xs text-orange">…</span>}
    </div>
  );
}
