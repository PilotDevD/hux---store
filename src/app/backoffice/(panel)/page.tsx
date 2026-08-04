import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet, TrendingUp, ShoppingCart, Boxes, ArrowRight, AlertTriangle,
  Clock, PackageCheck, Users,
} from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { getDashboardData } from "@/lib/analytics";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { BRAND_INFO, type Brand } from "@/lib/enums";
import { PageHeader, StatCard, SectionTitle } from "@/components/backoffice/bo-ui";
import { RevenueChart } from "@/components/backoffice/revenue-chart";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const staff = await guardModule("dashboard");
  const d = await getDashboardData();
  const maxBrand = Math.max(1, ...d.brandRevenue.map((b) => b.revenue));

  return (
    <>
      <PageHeader
        eyebrow={`Bem-vindo, ${staff.displayName.split(" ")[0]}`}
        title="Dashboard"
        subtitle="Visão geral do mês corrente e alertas operacionais."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Faturamento do mês" value={formatCents(d.monthRevenue)} icon={Wallet} delta={d.revenueDelta} hint="vs mês anterior" />
        <StatCard label="Lucro do mês" value={formatCents(d.monthProfit)} icon={TrendingUp} tone="positive" delta={d.profitDelta} hint="margem de produto" />
        <StatCard label="Vendas hoje" value={String(d.todayCount)} icon={ShoppingCart} tone="info" hint={formatCents(d.todayTotal)} />
        <StatCard label="Estoque (custo)" value={formatCents(d.stockCostValue)} icon={Boxes} hint={`${d.stockUnits} unidades`} />
      </div>

      {/* Alert row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link href="/backoffice/pedidos?status=AGUARDANDO_PAGAMENTO" className="card group flex items-center gap-4 p-5 transition-colors hover:border-warning/50">
          <div className="grid size-11 place-items-center rounded-full border border-warning/40 bg-warning/10">
            <Clock size={20} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl">{d.awaitingCount}</p>
            <p className="data-label text-muted">Aguardando pagamento</p>
          </div>
          <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-1" />
        </Link>
        <Link href="/backoffice/pedidos?status=PAGO" className="card group flex items-center gap-4 p-5 transition-colors hover:border-info/50">
          <div className="grid size-11 place-items-center rounded-full border border-info/40 bg-info/10">
            <PackageCheck size={20} className="text-info" />
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl">{d.pendingFulfillment}</p>
            <p className="data-label text-muted">A separar / enviar</p>
          </div>
          <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-1" />
        </Link>
        <Link href="/backoffice/estoque?baixo=1" className="card group flex items-center gap-4 p-5 transition-colors hover:border-negative/50">
          <div className="grid size-11 place-items-center rounded-full border border-negative/40 bg-negative/10">
            <AlertTriangle size={20} className="text-negative" />
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl">{d.lowStockCount}</p>
            <p className="data-label text-muted">Estoque baixo (≤3)</p>
          </div>
          <ArrowRight size={16} className="text-faint transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Revenue chart */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>Receita · últimos 7 dias</SectionTitle>
            <span className="chip">R$ (centenas)</span>
          </div>
          <RevenueChart data={d.series} />
        </div>

        {/* Revenue by brand */}
        <div className="card p-6">
          <SectionTitle>Receita por marca (mês)</SectionTitle>
          {d.brandRevenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Sem vendas pagas neste mês ainda.</p>
          ) : (
            <div className="space-y-4">
              {d.brandRevenue.map((b) => (
                <div key={b.brand}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{b.brand}</span>
                    <span className="text-muted">{formatCents(b.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-void">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(b.revenue / maxBrand) * 100}%`,
                        background: BRAND_INFO[b.brand as Brand]?.accent ?? "var(--color-orange)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionTitle>Últimos pedidos</SectionTitle>
            <Link href="/backoffice/pedidos" className="text-xs font-semibold text-orange hover:underline">Ver todos</Link>
          </div>
          {d.recentOrders.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Nenhum pedido ainda.</p>
          ) : (
            <div className="divide-y divide-line">
              {d.recentOrders.map((o) => (
                <Link key={o.number} href={`/backoffice/pedidos/${o.number}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-elevated">
                  <div>
                    <p className="font-mono text-sm font-semibold">{o.number}</p>
                    <p className="text-xs text-muted">{formatDate(o.createdAt)} · {o.itemCount} itens</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <span className="hidden text-sm font-semibold sm:block">{formatCents(o.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionTitle>Estoque baixo</SectionTitle>
            <Link href="/backoffice/estoque" className="text-xs font-semibold text-orange hover:underline">Gerenciar</Link>
          </div>
          {d.lowStock.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Tudo abastecido. 🎉</p>
          ) : (
            <div className="divide-y divide-line">
              {d.lowStock.map((v) => (
                <div key={v.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    <p className="font-mono text-xs text-muted">{v.brand} · {v.size} · {v.color}</p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-bold ${v.stock === 0 ? "text-negative" : "text-warning"}`}>
                    {v.stock} un
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
