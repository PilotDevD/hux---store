import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { formatCents } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { DespesasManager, type ExpenseRow } from "@/components/backoffice/despesas-manager";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Despesas" };

export default async function DespesasPage() {
  await guardModule("despesas");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const expenses = await db.expense.findMany({ orderBy: [{ paid: "asc" }, { dueDate: "asc" }], take: 300 });

  const monthExp = expenses.filter((e) => e.dueDate >= monthStart && e.dueDate <= monthEnd);
  const totalMonth = monthExp.reduce((s, e) => s + e.amount, 0);
  const paidMonth = monthExp.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
  const overdue = expenses.filter((e) => !e.paid && e.dueDate < now);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id, name: e.name, category: e.category, amount: e.amount,
    dueDate: e.dueDate.toISOString(), paid: e.paid, label: e.label,
  }));

  return (
    <>
      <PageHeader eyebrow="Financeiro" title="Despesas" subtitle="Gastos únicos e parcelados, com controle de vencimento e pagamento." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Despesas do mês" value={formatCents(totalMonth)} icon={Wallet} />
        <StatCard label="Já pago (mês)" value={formatCents(paidMonth)} icon={CheckCircle2} tone="positive" />
        <StatCard label="Vencidas em aberto" value={String(overdue.length)} hint={formatCents(overdue.reduce((s, e) => s + e.amount, 0))} icon={AlertTriangle} tone="negative" />
      </div>
      <DespesasManager expenses={rows} />
    </>
  );
}
