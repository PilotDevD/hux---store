import type { Metadata } from "next";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { formatDate, initials } from "@/lib/utils";
import { PageHeader, EmptyState, StatCard } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Clientes" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ClientesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("clientes");
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const where: Prisma.CustomerWhereInput = q
    ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ] }
    : {};

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      orders: { where: { status: { not: "CANCELADO" } }, select: { total: true, paymentStatus: true } },
    },
  });

  const rows = customers.map((c) => {
    const paid = c.orders.filter((o) => o.paymentStatus === "CONFIRMADO");
    const spent = paid.reduce((s, o) => s + o.total, 0);
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      createdAt: c.createdAt, orderCount: c.orders.length, spent,
    };
  });

  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const withOrders = rows.filter((r) => r.orderCount > 0).length;

  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Clientes" subtitle={`${rows.length} cadastrados`} />
      <BoFilterBar searchPlaceholder="Buscar por nome, e-mail ou telefone…" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Clientes" value={String(rows.length)} icon={Users} />
        <StatCard label="Compraram" value={String(withOrders)} icon={Users} tone="positive" />
        <StatCard label="Receita paga total" value={formatCents(totalSpent)} icon={Users} tone="info" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" hint="Clientes cadastrados na loja aparecerão aqui." />
      ) : (
        <div className="card divide-y divide-line">
          {rows.map((c) => (
            <Link key={c.id} href={`/backoffice/clientes/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-elevated">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated font-display text-sm text-orange">{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{formatCents(c.spent)}</p>
                <p className="font-mono text-xs text-muted">{c.orderCount} pedidos · desde {formatDate(c.createdAt)}</p>
              </div>
              <ArrowRight size={15} className="text-faint" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
