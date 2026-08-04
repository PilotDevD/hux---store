// All monetary values are stored as integer cents (BRL). These helpers convert
// and format. Never do float math on reais — work in cents.

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Format integer cents as "R$ 1.234,56". */
export function formatCents(cents: number): string {
  return BRL.format((cents ?? 0) / 100);
}

/** Format cents without the currency symbol: "1.234,56". */
export function formatCentsPlain(cents: number): string {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a user-typed reais string ("1.234,56" or "1234.56" or "49,90") to cents. */
export function parseReaisToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** reais (float) -> cents */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/** cents -> reais (float) — only for display/inputs, never for storage math. */
export function centsToReais(cents: number): number {
  return (cents ?? 0) / 100;
}

export function percentOff(compareAt: number | null | undefined, price: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
