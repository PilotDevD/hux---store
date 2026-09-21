import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, EXPENSE_CATEGORY_LABELS, type ProductType } from "@/lib/enums";
import { PageHeader, StatCard } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { ExportReportButton, type ReportSection } from "@/components/backoffice/export-report-button";
import { ShoppingCart, Wallet, Store, Globe, Megaphone, Users, TrendingUp } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Relatórios" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PAID = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <p className="eyebrow">{title}</p>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function RankTable({ rows, unitLabel = "un" }: { rows: { label: string; qty: number; revenue: number }[]; unitLabel?: string }) {
  if (rows.length === 0) return <p className="card p-6 text-center text-sm text-muted">Sem dados no período.</p>;
  const max = Math.max(...rows.map((r) => r.qty), 1);
  return (
    <div className="card divide-y divide-line">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-4 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.label}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-orange" style={{ width: `${Math.round((r.qty / max) * 100)}%` }} />
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold">{r.qty} {unitLabel}</p>
            <p className="text-xs text-muted">{formatCents(r.revenue)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("relatorios");
  const sp = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const deStr = first(sp.de);
  const ateStr = first(sp.ate);
  const de = deStr ? new Date(`${deStr}T00:00:00`) : monthStart;
  const ate = ateStr ? new Date(`${ateStr}T23:59:59`) : now;

  const paidWindow: Prisma.OrderWhereInput = {
    paymentStatus: "CONFIRMADO",
    status: { in: PAID },
    OR: [
      { paidAt: { gte: de, lte: ate } },
      { AND: [{ paidAt: null }, { createdAt: { gte: de, lte: ate } }] },
    ],
  };

  const [orders, users, expenses, ambassadors] = await Promise.all([
    db.order.findMany({
      where: paidWindow,
      select: {
        channel: true, subtotal: true, discountTotal: true, total: true, couponId: true,
        soldByUserId: true, soldByName: true,
        items: { select: { brand: true, productName: true, type: true, qty: true, lineTotal: true } },
      },
    }),
    db.user.findMany({ select: { id: true, displayName: true, commissionPct: true } }),
    db.expense.findMany({ where: { dueDate: { gte: de, lte: ate } } }),
    db.ambassador.findMany({ include: { coupon: { select: { id: true, code: true } } } }),
  ]);

  // ---- sales summary ----
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const goodsNet = orders.reduce((s, o) => s + (o.subtotal - o.discountTotal), 0);
  const onlineOrders = orders.filter((o) => o.channel === "ONLINE");
  const manualOrders = orders.filter((o) => o.channel === "MANUAL");
  const ticket = orders.length ? Math.round(revenue / orders.length) : 0;

  // ---- product breakdowns ----
  const catMap = new Map<string, { qty: number; revenue: number }>();
  const prodMap = new Map<string, { qty: number; revenue: number }>();
  const brandMap = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const cat = PRODUCT_TYPE_LABELS[it.type as ProductType] ?? it.type;
      const c = catMap.get(cat) ?? { qty: 0, revenue: 0 }; c.qty += it.qty; c.revenue += it.lineTotal; catMap.set(cat, c);
      const p = prodMap.get(it.productName) ?? { qty: 0, revenue: 0 }; p.qty += it.qty; p.revenue += it.lineTotal; prodMap.set(it.productName, p);
      const b = brandMap.get(it.brand) ?? { qty: 0, revenue: 0 }; b.qty += it.qty; b.revenue += it.lineTotal; brandMap.set(it.brand, b);
    }
  }
  const toRows = (m: Map<string, { qty: number; revenue: number }>, n?: number) =>
    [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.qty - a.qty).slice(0, n);

  const byCategory = toRows(catMap);
  const byBrand = toRows(brandMap);
  const topProducts = toRows(prodMap, 10);
  const totalItems = [...catMap.values()].reduce((s, v) => s + v.qty, 0);

  // ---- expenses ----
  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expPaid = expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
  const expPending = expTotal - expPaid;
  const expByCat = new Map<string, number>();
  for (const e of expenses) expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount);
  const expenseRows = [...expByCat.entries()].map(([cat, amount]) => ({ label: EXPENSE_CATEGORY_LABELS[cat] ?? cat, amount })).sort((a, b) => b.amount - a.amount);

  // ---- seller commissions ----
  const pctById = new Map(users.map((u) => [u.id, u.commissionPct]));
  const commMap = new Map<string, { name: string; count: number; net: number }>();
  for (const o of orders) {
    if (!o.soldByUserId) continue;
    const cur = commMap.get(o.soldByUserId) ?? { name: o.soldByName ?? "—", count: 0, net: 0 };
    cur.count += 1; cur.net += o.subtotal - o.discountTotal; commMap.set(o.soldByUserId, cur);
  }
  const sellerRows = [...commMap.entries()].map(([id, v]) => {
    const pct = pctById.get(id) ?? 0;
    return { name: v.name, count: v.count, net: v.net, pct, commission: Math.round(v.net * (pct / 100)) };
  }).sort((a, b) => b.net - a.net);
  const totalCommission = sellerRows.reduce((s, r) => s + r.commission, 0);

  // ---- ambassadors ----
  const ambRows = ambassadors.map((a) => {
    const used = a.coupon ? orders.filter((o) => o.couponId === a.coupon!.id) : [];
    const net = used.reduce((s, o) => s + (o.subtotal - o.discountTotal), 0);
    return { name: a.name, code: a.coupon?.code ?? "—", count: used.length, net, cashback: Math.round(net * (a.cashbackPct / 100)), pct: a.cashbackPct };
  }).sort((a, b) => b.net - a.net);
  const totalCashback = ambRows.reduce((s, r) => s + r.cashback, 0);

  const fmtDay = (d: Date) => d.toLocaleDateString("pt-BR");

  const sections: ReportSection[] = [
    { title: "Resumo de vendas", headers: ["Métrica", "Valor"], rows: [
      ["Vendas (período)", orders.length],
      ["Receita bruta", formatCents(revenue)],
      ["Receita em produtos", formatCents(goodsNet)],
      ["Vendas físicas", manualOrders.length],
      ["Vendas online", onlineOrders.length],
      ["Ticket médio", formatCents(ticket)],
      ["Itens vendidos", totalItems],
    ] },
    { title: "Produtos vendidos por categoria", headers: ["Categoria", "Qtd", "Receita"], rows: byCategory.map((r) => [r.label, r.qty, formatCents(r.revenue)]) },
    { title: "Vendas por marca", headers: ["Marca", "Qtd", "Receita"], rows: byBrand.map((r) => [r.label, r.qty, formatCents(r.revenue)]) },
    { title: "Produtos mais vendidos", headers: ["Produto", "Qtd", "Receita"], rows: topProducts.map((r) => [r.label, r.qty, formatCents(r.revenue)]) },
    { title: "Despesas por categoria", headers: ["Categoria", "Valor"], rows: expenseRows.map((r) => [r.label, formatCents(r.amount)]) },
    { title: "Comissões dos vendedores", headers: ["Vendedor", "Vendas", "Receita", "%", "Comissão"], rows: sellerRows.map((r) => [r.name, r.count, formatCents(r.net), `${r.pct}%`, formatCents(r.commission)]) },
    { title: "Embaixadores (cashback)", headers: ["Embaixador", "Cupom", "Usos", "Receita gerada", "%", "Cashback"], rows: ambRows.map((r) => [r.name, r.code, r.count, formatCents(r.net), `${r.pct}%`, formatCents(r.cashback)]) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Análise"
        title="Relatórios"
        subtitle={`Período: ${fmtDay(de)} — ${fmtDay(ate)}. Ajuste as datas para outro intervalo.`}
        action={<ExportReportButton title={`Relatório HUX — ${fmtDay(de)} a ${fmtDay(ate)}`} filename={`relatorio-hux-${deStr ?? "inicio"}_${ateStr ?? "hoje"}.xls`} sections={sections} />}
      />

      <BoFilterBar dateRange searchPlaceholder="—" />

      {/* Vendas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendas (período)" value={String(orders.length)} hint={formatCents(revenue)} icon={ShoppingCart} tone="positive" />
        <StatCard label="Físicas" value={String(manualOrders.length)} icon={Store} />
        <StatCard label="Online" value={String(onlineOrders.length)} icon={Globe} tone="info" />
        <StatCard label="Ticket médio" value={formatCents(ticket)} icon={TrendingUp} />
      </div>
      <p className="mt-2 text-xs text-faint">Receita bruta {formatCents(revenue)} · receita em produtos {formatCents(goodsNet)} · {totalItems} itens vendidos.</p>

      <Section title="Produtos vendidos por categoria">
        <RankTable rows={byCategory} />
      </Section>

      <Section title="Vendas por marca">
        <RankTable rows={byBrand} />
      </Section>

      <Section title="Produtos mais vendidos (Top 10)" hint="por quantidade">
        <RankTable rows={topProducts} />
      </Section>

      {/* Despesas */}
      <Section title="Despesas do período">
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={formatCents(expTotal)} icon={Wallet} />
          <StatCard label="Pagas" value={formatCents(expPaid)} tone="positive" />
          <StatCard label="A pagar" value={formatCents(expPending)} tone="warning" />
        </div>
        {expenseRows.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Nenhuma despesa no período.</p>
        ) : (
          <div className="card divide-y divide-line">
            {expenseRows.map((e) => (
              <div key={e.label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{e.label}</span><span className="font-semibold">{formatCents(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Resultado */}
      <Section title="Resultado do período" hint="receita de produtos − despesas">
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-muted">Receita em produtos {formatCents(goodsNet)} − despesas {formatCents(expTotal)}</p>
          </div>
          <p className={`font-display text-3xl ${goodsNet - expTotal >= 0 ? "text-positive" : "text-negative"}`}>{formatCents(goodsNet - expTotal)}</p>
        </div>
      </Section>

      {/* Comissões vendedores */}
      <Section title="Comissões dos vendedores" hint={`total ${formatCents(totalCommission)}`}>
        {sellerRows.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Nenhuma venda com vendedor no período.</p>
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[2fr_0.8fr_1fr_0.6fr_1fr] gap-4 border-b border-line px-5 py-2 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
              <span>Vendedor</span><span>Vendas</span><span>Receita</span><span>%</span><span>Comissão</span>
            </div>
            <div className="divide-y divide-line">
              {sellerRows.map((c) => (
                <div key={c.name} className="grid grid-cols-2 items-center gap-4 px-5 py-3 md:grid-cols-[2fr_0.8fr_1fr_0.6fr_1fr]">
                  <span className="flex items-center gap-2 text-sm font-medium"><Users size={14} className="text-faint" /> {c.name}</span>
                  <span className="hidden text-sm text-muted md:block">{c.count}</span>
                  <span className="text-sm text-muted">{formatCents(c.net)}</span>
                  <span className="hidden text-sm text-muted md:block">{c.pct}%</span>
                  <span className="text-sm font-semibold text-brand">{formatCents(c.commission)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Comissões embaixadores */}
      <Section title="Embaixadores (cashback)" hint={`total ${formatCents(totalCashback)}`}>
        {ambRows.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Nenhum embaixador cadastrado.</p>
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[2fr_1fr_0.8fr_1fr_0.6fr_1fr] gap-4 border-b border-line px-5 py-2 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
              <span>Embaixador</span><span>Cupom</span><span>Usos</span><span>Receita gerada</span><span>%</span><span>Cashback</span>
            </div>
            <div className="divide-y divide-line">
              {ambRows.map((a) => (
                <div key={a.name} className="grid grid-cols-2 items-center gap-4 px-5 py-3 md:grid-cols-[2fr_1fr_0.8fr_1fr_0.6fr_1fr]">
                  <span className="flex items-center gap-2 text-sm font-medium"><Megaphone size={14} className="text-faint" /> {a.name}</span>
                  <span className="font-mono text-xs text-muted">{a.code}</span>
                  <span className="hidden text-sm text-muted md:block">{a.count}</span>
                  <span className="text-sm text-muted">{formatCents(a.net)}</span>
                  <span className="hidden text-sm text-muted md:block">{a.pct}%</span>
                  <span className="text-sm font-semibold text-brand">{formatCents(a.cashback)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
