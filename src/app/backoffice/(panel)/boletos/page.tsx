import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { BoletosTable, type BoletoRow } from "@/components/backoffice/boletos-table";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Boletos" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BoletosPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("boletos");
  const sp = await searchParams;
  const f = first(sp.f) ?? "todos";
  const now = new Date();

  const installments = await db.installment.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      order: { select: { number: true, customerSnapshot: true, customer: { select: { name: true } } } },
    },
  });

  const all: BoletoRow[] = [];
  const countByOrder: Record<string, number> = {};
  for (const i of installments) countByOrder[i.orderId] = (countByOrder[i.orderId] ?? 0) + 1;

  for (const i of installments) {
    const snap = parseJson<{ name?: string }>(i.order.customerSnapshot, {});
    const overdue = i.status === "PENDENTE" && i.dueDate < now;
    all.push({
      id: i.id,
      orderNumber: i.order.number,
      customerName: i.order.customer?.name ?? snap.name ?? "—",
      seq: i.seq,
      total: countByOrder[i.orderId] ?? 1,
      amount: i.amount,
      dueDate: i.dueDate.toISOString(),
      status: i.status,
      overdue,
    });
  }

  const aReceber = all.filter((r) => r.status === "PENDENTE").reduce((s, r) => s + r.amount, 0);
  const vencidos = all.filter((r) => r.overdue);
  const pagoTotal = all.filter((r) => r.status === "PAGO").reduce((s, r) => s + r.amount, 0);

  const rows =
    f === "avencer" ? all.filter((r) => r.status === "PENDENTE" && !r.overdue)
    : f === "vencidos" ? all.filter((r) => r.overdue)
    : f === "pagos" ? all.filter((r) => r.status === "PAGO")
    : all;

  const filters = [
    { id: "todos", label: "Todos" },
    { id: "avencer", label: "A vencer" },
    { id: "vencidos", label: "Vencidos" },
    { id: "pagos", label: "Pagos" },
  ];

  return (
    <>
      <PageHeader eyebrow="Financeiro" title="Boletos" subtitle="Acompanhe vencimentos, parcelas e dê baixa nos pagamentos." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="A receber" value={formatCents(aReceber)} icon={Wallet} tone="warning" />
        <StatCard label="Vencidos" value={String(vencidos.length)} hint={formatCents(vencidos.reduce((s, r) => s + r.amount, 0))} icon={AlertTriangle} tone="negative" />
        <StatCard label="Recebido (baixado)" value={formatCents(pagoTotal)} icon={CheckCircle2} tone="positive" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((x) => (
          <Link
            key={x.id}
            href={x.id === "todos" ? "/backoffice/boletos" : `/backoffice/boletos?f=${x.id}`}
            className={cn("chip transition-colors", f === x.id ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft")}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted">
          Nenhum boleto emitido ainda. Boletos aparecem aqui quando um cliente escolhe boleto no checkout.
        </div>
      ) : (
        <BoletosTable rows={rows} />
      )}
    </>
  );
}
