"use client";

import { useMemo, useState } from "react";
import { User } from "lucide-react";

export type CustomerLite = { id: string; name: string; phone: string | null; email: string | null };

/**
 * Reusable customer field: type a name and it suggests customers from the base.
 * Free typing is allowed (new customer). `onPick` fires when an existing one is
 * chosen so the consumer can fill phone / capture the id.
 */
export function CustomerAutocomplete({
  customers,
  name,
  onName,
  onPick,
  placeholder = "Nome do cliente",
  className = "field",
}: {
  customers: CustomerLite[];
  name: string;
  onName: (v: string) => void;
  onPick?: (c: CustomerLite) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focus, setFocus] = useState(false);
  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    const list = customers.filter((c) =>
      `${c.name} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q),
    );
    // Hide when the only match is exactly what's typed.
    if (list.length === 1 && list[0].name.toLowerCase() === q) return [];
    return list.slice(0, 8);
  }, [name, customers]);

  return (
    <div className="relative">
      <input
        className={className}
        value={name}
        onChange={(e) => onName(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {focus && matches.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-[var(--radius)] border border-line bg-graphite shadow-xl">
          {matches.map((c) => (
            <button
              type="button"
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); onName(c.name); onPick?.(c); setFocus(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-elevated"
            >
              <span className="flex min-w-0 items-center gap-2"><User size={13} className="shrink-0 text-faint" /><span className="truncate">{c.name}</span></span>
              <span className="ml-2 shrink-0 font-mono text-xs text-muted">{c.phone ?? c.email ?? ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
