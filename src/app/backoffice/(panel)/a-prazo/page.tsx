import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Wallet, AlertTriangle, HandCoins } from "lucide-react";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { parseJson, cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { AprazoManager, type AprazoOrder } from "@/components/backoffice/aprazo-manager";

export const metadata: Metadata = { title: "Vendas a prazo" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AprazoPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("aprazo");
  const sp = await searchParams;
  const f = first(sp.f) ?? "todos";
  const now = new Date();

  const orders = await db.order.findMany({
    where: { paymentMethod: "A_PRAZO" },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      installments: { orderBy: { seq: "asc" } },
    },
  });

  const rows: AprazoOrder[] = orders.map((o) => {
    const insts = o.installments;
    const count = insts.length;
    const paidCount = insts.filter((i) => i.status === "PAGO").length;
    const received = insts.filter((i) => i.status === "PAGO").reduce((s, i) => s + i.amount, 0);
    const balance = insts.filter((i) => i.status === "PENDENTE").reduce((s, i) => s + i.amount, 0);
    const overdueCount = insts.filter((i) => i.status === "PENDENTE" && i.dueDate < now).length;
    const nextDueInst = insts.filter((i) => i.status === "PENDENTE").sort((a, b) => +a.dueDate - +b.dueDate)[0];
    const fullyPaid = count > 0 && paidCount === count;
    return {
      number: o.number,
      customerName: o.customer?.name ?? parseJson<{ name?: string }>(o.customerSnapshot, {}).name ?? "Cliente",
      sellerName: o.soldByName ?? "—",
      createdAt: o.createdAt.toISOString(),
      total: o.total,
      downPayment: o.downPayment,
      received,
      balance,
      count,
      paidCount,
      overdueCount,
      nextDue: nextDueInst ? nextDueInst.dueDate.toISOString() : null,
      fullyPaid,
      installments: insts.map((i) => ({
        id: i.id, seq: i.seq, amount: i.amount, dueDate: i.dueDate.toISOString(),
        status: i.status, overdue: i.status === "PENDENTE" && i.dueDate < now,
      })),
    };
  });

  const aReceber = rows.reduce((s, r) => s + r.balance, 0);
  const entradas = rows.reduce((s, r) => s + r.downPayment, 0);
  const emAberto = rows.filter((r) => !r.fullyPaid).length;
  const vencidas = rows.reduce((s, r) => s + r.overdueCount, 0);

  const filtered =
    f === "abertas" ? rows.filter((r) => !r.fullyPaid)
    : f === "vencidas" ? rows.filter((r) => r.overdueCount > 0)
    : f === "quitadas" ? rows.filter((r) => r.fullyPaid)
    : rows;

  const filters = [
    { id: "todos", label: "Todas" },
    { id: "abertas", label: "Em aberto" },
    { id: "vencidas", label: "Com atraso" },
    { id: "quitadas", label: "Quitadas" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Vendas a prazo"
        subtitle="Crediário próprio: entrada, parcelas e recebimentos. Lance novas vendas a prazo pela tela de Vendas."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="A receber" value={formatCents(aReceber)} icon={Wallet} tone="warning" />
        <StatCard label="Parcelas vencidas" value={String(vencidas)} icon={AlertTriangle} tone="negative" />
        <StatCard label="Entradas recebidas" value={formatCents(entradas)} icon={HandCoins} tone="positive" />
        <StatCard label="Crediários em aberto" value={String(emAberto)} icon={CalendarClock} tone="info" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((x) => (
          <Link
            key={x.id}
            href={x.id === "todos" ? "/backoffice/a-prazo" : `/backoffice/a-prazo?f=${x.id}`}
            className={cn("chip transition-colors", f === x.id ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft")}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <AprazoManager orders={filtered} />
    </>
  );
}
