import { db } from "./db";
import { parseJson } from "./utils";

export type ShippingQuote = {
  ruleId: string;
  name: string;
  price: number; // cents (0 = grátis)
  etaDays: number;
  free: boolean;
  label: string;
};

/**
 * Best shipping quote for a destination UF + cart subtotal.
 * UF-specific rules win over the national fallback (by priority), then lowest
 * price. `freeAbove` zeroes the price when the subtotal qualifies.
 */
export async function computeShipping(
  uf: string,
  subtotalCents: number,
): Promise<ShippingQuote | null> {
  const rules = await db.shippingRule.findMany({ where: { active: true } });
  if (rules.length === 0) return null;

  const matching = rules.filter((r) => {
    if (r.matchType === "ALL") return true;
    if (r.matchType === "UF") {
      const list = parseJson<string[]>(r.ufList, []);
      return list.includes(uf.toUpperCase());
    }
    return false; // CEP_RANGE handled by UF/ALL for now
  });

  if (matching.length === 0) return null;

  // Prefer more specific (UF) rules, then higher priority, then cheaper.
  matching.sort((a, b) => {
    const specA = a.matchType === "UF" ? 1 : 0;
    const specB = b.matchType === "UF" ? 1 : 0;
    if (specA !== specB) return specB - specA;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.price - b.price;
  });

  const rule = matching[0];
  const free = rule.freeAbove != null && subtotalCents >= rule.freeAbove;
  const price = free ? 0 : rule.price;
  const etaLabel = `${rule.etaDays} ${rule.etaDays === 1 ? "dia útil" : "dias úteis"}`;

  return {
    ruleId: rule.id,
    name: rule.name,
    price,
    etaDays: rule.etaDays,
    free,
    label: `${rule.name} · ${etaLabel}`,
  };
}
