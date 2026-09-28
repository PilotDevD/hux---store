import "server-only";
import { db } from "./db";

const PAID_STATUSES = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function pctDelta(current: number, previous: number): { value: number; positive: boolean } | null {
  if (previous === 0) return current > 0 ? { value: 100, positive: true } : null;
  const v = Math.round(((current - previous) / previous) * 100);
  return { value: v, positive: v >= 0 };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export type DashboardRange = { start: Date; end: Date };

export async function getDashboardData(range?: DashboardRange) {
  const now = new Date();
  const periodStart = range?.start ?? startOfMonth(now);
  const periodEnd = range?.end ?? now;
  // Previous period of the same length, for the deltas.
  const spanMs = Math.max(1, periodEnd.getTime() - periodStart.getTime());
  const prevStart = new Date(periodStart.getTime() - spanMs);
  const prevEnd = periodStart;
  const todayStart = startOfDay(now);

  const [paidOrders, awaiting, variants, recentOrders, pendingProdCount, customersCount] =
    await Promise.all([
      db.order.findMany({
        where: { paymentStatus: "CONFIRMADO", status: { in: PAID_STATUSES } },
        include: { items: true },
      }),
      db.order.findMany({
        where: { status: "AGUARDANDO_PAGAMENTO" },
        select: { total: true },
      }),
      db.productVariant.findMany({
        where: { active: true },
        include: { product: { select: { name: true, brand: true } } },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 7,
        include: { items: { select: { id: true } } },
      }),
      db.order.count({ where: { status: { in: ["PAGO", "EM_SEPARACAO"] } } }),
      db.customer.count(),
    ]);

  // --- revenue / profit (selected period vs previous equal span) ---
  let periodRevenue = 0, periodProfit = 0, lastRevenue = 0, lastProfit = 0;
  let periodCount = 0, periodTotal = 0;
  let onlineCount = 0, onlineRevenue = 0, manualCount = 0, manualRevenue = 0;
  const brandRevenue: Record<string, number> = {};
  const productQty: Record<string, { name: string; brand: string; qty: number; revenue: number }> = {};

  // last 7 days series
  const series: { day: string; revenue: number }[] = [];
  const dayBuckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dayBuckets[key] = 0;
    series.push({ day: key, revenue: 0 });
  }

  for (const o of paidOrders) {
    const net = o.subtotal - o.discountTotal;
    const profit = net - o.costTotal;
    const created = new Date(o.paidAt ?? o.createdAt);

    if (created >= periodStart && created <= periodEnd) {
      periodRevenue += net;
      periodProfit += profit;
      periodCount += 1;
      periodTotal += o.total;
      if (o.channel === "MANUAL") { manualCount++; manualRevenue += net; }
      else { onlineCount++; onlineRevenue += net; }
      for (const it of o.items) {
        brandRevenue[it.brand] = (brandRevenue[it.brand] ?? 0) + it.lineTotal;
        const k = `${it.brand}·${it.productName}`;
        productQty[k] = productQty[k] ?? { name: it.productName, brand: it.brand, qty: 0, revenue: 0 };
        productQty[k].qty += it.qty;
        productQty[k].revenue += it.lineTotal;
      }
    } else if (created >= prevStart && created < prevEnd) {
      lastRevenue += net;
      lastProfit += profit;
    }

    // 7-day series (always the last 7 days, independent of the filter)
    const key = `${created.getMonth() + 1}/${created.getDate()}`;
    if (key in dayBuckets) dayBuckets[key] += net;
  }

  for (const s of series) s.revenue = dayBuckets[s.day] ?? 0;

  // --- inventory ---
  let stockUnits = 0, stockCostValue = 0;
  const lowStock: { name: string; brand: string; size: string; color: string; stock: number; sku: string }[] = [];
  for (const v of variants) {
    stockUnits += v.stock;
    stockCostValue += v.stock * v.cost;
    if (v.stock <= 3) {
      lowStock.push({
        name: v.product.name, brand: v.product.brand, size: v.size,
        color: v.color, stock: v.stock, sku: v.sku,
      });
    }
  }
  lowStock.sort((a, b) => a.stock - b.stock);

  const topProducts = Object.values(productQty).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const brandRevenueArr = Object.entries(brandRevenue)
    .map(([brand, revenue]) => ({ brand, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const awaitingTotal = awaiting.reduce((s, o) => s + o.total, 0);

  return {
    periodRevenue,
    periodProfit,
    revenueDelta: pctDelta(periodRevenue, lastRevenue),
    profitDelta: pctDelta(periodProfit, lastProfit),
    periodCount,
    periodTotal,
    onlineCount,
    onlineRevenue,
    manualCount,
    manualRevenue,
    awaitingCount: awaiting.length,
    awaitingTotal,
    pendingFulfillment: pendingProdCount,
    stockUnits,
    stockCostValue,
    lowStock: lowStock.slice(0, 8),
    lowStockCount: lowStock.length,
    customersCount,
    series,
    brandRevenue: brandRevenueArr,
    topProducts,
    recentOrders: recentOrders.map((o) => ({
      number: o.number,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      itemCount: o.items.length,
    })),
  };
}
