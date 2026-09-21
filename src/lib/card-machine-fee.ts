// Pure helpers for card-machine fees (safe to import on client and server).

export type InstallmentFee = { n: number; pct: number };
export type CardMachineOption = {
  id: string;
  name: string;
  provider: string | null;
  debitFee: number;
  creditFee: number;
  pixFee: number;
  installmentFees: InstallmentFee[];
};

/** Fee percentage for a given payment method + installment count. */
export function feeForSale(m: CardMachineOption, method: string, installments = 1): number {
  if (method === "DEBITO") return m.debitFee;
  if (method === "PIX_MANUAL") return m.pixFee;
  if (method === "CARTAO") {
    if (installments <= 1) return m.creditFee;
    const found = m.installmentFees.find((f) => f.n === installments);
    return found ? found.pct : m.creditFee;
  }
  return 0;
}

/** Net amount received (cents) after applying the machine fee. */
export function netAfterFee(totalCents: number, feePct: number): number {
  return Math.round(totalCents * (1 - feePct / 100));
}
