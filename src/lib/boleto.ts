// Manual boleto helpers. Generates a placeholder "linha digitável" and an
// installment schedule (parcelas). This is NOT a real bank slip — when a real
// issuer (PagSeguro) is integrated, replace generateLinha()/buildInstallments()
// with the issuer's response and keep the same Installment rows.

function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/** 47-digit placeholder grouped like a real linha digitável (not a valid slip). */
export function generateLinha(): string {
  return (
    `${randDigits(5)}.${randDigits(5)} ` +
    `${randDigits(5)}.${randDigits(6)} ` +
    `${randDigits(5)}.${randDigits(6)} ` +
    `${randDigits(1)} ${randDigits(14)}`
  );
}

export type InstallmentPlan = {
  seq: number;
  amount: number; // cents
  dueDate: Date;
  linha: string;
};

export const MAX_BOLETO_PARCELAS = 3;

/**
 * Split a total into N boletos. First due in ~3 days, then +30 days each.
 * Rounding remainder goes to the last parcela.
 */
export function buildInstallments(totalCents: number, parcelas: number): InstallmentPlan[] {
  const n = Math.max(1, Math.min(MAX_BOLETO_PARCELAS, Math.floor(parcelas || 1)));
  const base = Math.floor(totalCents / n);
  const plans: InstallmentPlan[] = [];
  for (let i = 0; i < n; i++) {
    const amount = i === n - 1 ? totalCents - base * (n - 1) : base;
    const due = new Date();
    due.setDate(due.getDate() + 3 + i * 30);
    due.setHours(23, 59, 59, 0);
    plans.push({ seq: i + 1, amount, dueDate: due, linha: generateLinha() });
  }
  return plans;
}
