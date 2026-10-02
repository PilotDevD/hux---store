import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet, TrendingUp, ShoppingCart, Boxes, ArrowRight, AlertTriangle,
  Clock, PackageCheck, Users,
} from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/analytics";
import { getAlerts } from "@/lib/alerts";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { BRAND_INFO, type Brand } from "@/lib/enums";
import { PageHeader, StatCard, SectionTitle } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { RevenueChart } from "@/components/backoffice/revenue-chart";
import { CaixaCard, type CashRow } from "@/components/backoffice/caixa-card";
import { OrderStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function resolveRange(periodo: string, de?: string, ate?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (de || ate) {
    const start = de ? new Date(`${de}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = ate ? new Date(`${ate}T23:59:59`) : now;
    return { start, end, label: "Período personalizado" };
  }
  if (periodo === "dia") return { start: startOfDay(now), end: now, label: "Hoje" };
  if (periodo === "semana") {
    const dow = (now.getDay() + 6) % 7; // segunda = 0
    const start = startOfDay(now);
    start.setDate(start.getDate() - dow);
    return { start, end: now, label: "Esta semana" };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: "Este mês" };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await guardModule("dashboard");
  const sp = await searchParams;
  const periodo = first(sp.periodo) ?? "mes";
  const range = resolveRange(periodo, first(sp.de), first(sp.ate));

  const restricted = staff.onlyOwnSales; // vendedor restrito: só vê os próprios números
  const [d, alerts, cashEntries] = await Promise.all([
    getDashboardData({ start: range.start, end: range.end }, { sellerId: restricted ? staff.id : undefined }),
    getAlerts(),
    db.cashEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const maxBrand = Math.max(1, ...d.brandRevenue.map((b) => b.revenue));

  // Caixa em espécie
  const cashBalance = cashEntries.reduce((s, e) => s + (e.kind === "ENTRADA" ? e.amount : -e.amount), 0);
  const cashRows: CashRow[] = cashEntries.slice(0, 20).map((e) => ({
    id: e.id, kind: e.kind, amount: e.amount, note: e.note, userName: e.userName, createdAt: e.createdAt.toISOString(),
  }));
  const todayStart = startOfDay(new Date());
  const cashSalesToday = (await db.order.findMany({
    where: { channel: "MANUAL", paymentMethod: "DINHEIRO", paymentStatus: "CONFIRMADO", createdAt: { gte: todayStart } },
    select: { total: true },
  })).reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        eyebrow={`Bem-vindo, ${staff.displayName.split(" ")[0]}`}
        title="Dashboard"
        subtitle={`Visão do período: ${range.label.toLowerCase()}. Ajuste o filtro abaixo.`}
      />

      <BoFilterBar
        noSearch
        dateRange
        selects={[
          { param: "periodo", label: "Período: mês", options: [
            { value: "dia", label: "Hoje" },
            { value: "semana", label: "Esta semana" },
            { value: "mes", label: "Este mês" },
          ] },
        ]}
      />

      {/* KPIs */}
      {restricted ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Meu faturamento (período)" value={formatCents(d.periodRevenue)} icon={Wallet} tone="positive" />
          <StatCard label="Minhas vendas (período)" value={String(d.periodCount)} icon={ShoppingCart} tone="info" hint={formatCents(d.periodTotal)} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Faturamento do período" value={formatCents(d.periodRevenue)} icon={Wallet} delta={d.revenueDelta} hint="vs período anterior" />
          <StatCard label="Lucro do período" value={formatCents(d.periodProfit)} icon={TrendingUp} tone="positive" delta={d.profitDelta} hint="margem de produto" />
          <StatCard label="Vendas no período" value={String(d.periodCount)} icon={ShoppingCart} tone="info" hint={formatCents(d.periodTotal)} />
          <StatCard label="Estoque (custo)" value={formatCents(d.stockCostValue)} icon={Boxes} hint={`${d.stockUnits} unidades`} />
        </div>
      )}

      {/* Owner-only blocks (hidden for restricted sellers) */}
      {!restricted && (
      <div className="mt-4">
        <CaixaCard balance={cashBalance} entries={cashRows} cashSalesToday={cashSalesToday} />
      </div>
      )}

      {/* Alert row */}
      {!restricted && (
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
      )}

      {/* Central de alertas */}
      {!restricted && (
      <div className="mt-4 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <SectionTitle>Central de alertas</SectionTitle>
          {alerts.counts.total > 0 && (
            <span className="rounded-full bg-negative/10 px-2.5 py-1 font-mono text-xs text-negative">{alerts.counts.total} pendência(s)</span>
          )}
        </div>
        {alerts.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Tudo em dia — nenhum vencimento ou alerta no momento. 🎉</p>
        ) : (
          <div className="divide-y divide-line">
            {alerts.items.slice(0, 10).map((a) => (
              <Link key={a.id} href={a.link} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-elevated">
                <span className={`size-2 shrink-0 rounded-full ${a.overdue ? "bg-negative" : a.kind === "REMARKETING" ? "bg-info" : "bg-warning"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted">{a.detail}{a.date ? ` · ${formatDate(a.date)}` : ""}</p>
                </div>
                {a.amount != null && <span className={`shrink-0 text-sm font-semibold ${a.overdue ? "text-negative" : "text-ink-soft"}`}>{formatCents(a.amount)}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Sales channel split */}
      {!restricted && (
      <div className="mt-6 card p-6">
        <SectionTitle>Vendas do período · físico × online</SectionTitle>
        {(() => {
          const totalRev = Math.max(1, d.manualRevenue + d.onlineRevenue);
          const rows = [
            { label: "Vendas físicas", count: d.manualCount, rev: d.manualRevenue, color: "var(--color-brand)" },
            { label: "Loja online", count: d.onlineCount, rev: d.onlineRevenue, color: "var(--color-info)" },
          ];
          return (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{r.label} <span className="text-muted">· {r.count} venda(s)</span></span>
                    <span className="text-muted">{formatCents(r.rev)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-void">
                    <div className="h-full rounded-full" style={{ width: `${(r.rev / totalRev) * 100}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      )}

      {!restricted && (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
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
          <SectionTitle>Receita por marca (período)</SectionTitle>
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
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionTitle>{restricted ? "Minhas vendas recentes" : "Últimos pedidos"}</SectionTitle>
            {!restricted && <Link href="/backoffice/pedidos" className="text-xs font-semibold text-orange hover:underline">Ver todos</Link>}
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
        {!restricted && (
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
        )}
      </div>
    </>
  );
}
