import "server-only";
import { db } from "./db";
import { parseJson } from "./utils";

export type AlertItem = {
  id: string;
  kind: "BOLETO" | "DESPESA" | "REMARKETING" | "PEDIDO";
  title: string;
  detail: string;
  date: Date | null;
  overdue: boolean;
  amount?: number;
  link: string;
};

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export async function getAlerts(): Promise<{
  items: AlertItem[];
  counts: { boletos: number; despesas: number; remarketing: number; pedidos: number; total: number };
}> {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 5);

  const [installments, expenses, cardOrders, pendingOrders] = await Promise.all([
    db.installment.findMany({
      where: { status: "PENDENTE", dueDate: { lte: soon } },
      orderBy: { dueDate: "asc" },
      include: { order: { select: { number: true, customerSnapshot: true, customer: { select: { name: true } } } } },
    }),
    db.expense.findMany({ where: { paid: false, dueDate: { lte: soon } }, orderBy: { dueDate: "asc" } }),
    db.order.findMany({
      where: { paymentMethod: "CARTAO", cardInstallments: { gt: 1 }, remarketed: false, status: { not: "CANCELADO" } },
      select: { id: true, number: true, cardInstallments: true, paidAt: true, createdAt: true, customerSnapshot: true, customer: { select: { name: true } } },
    }),
    db.order.findMany({ where: { status: "AGUARDANDO_PAGAMENTO" }, orderBy: { createdAt: "desc" }, select: { number: true, total: true, createdAt: true, customerSnapshot: true, customer: { select: { name: true } } } }),
  ]);

  const items: AlertItem[] = [];

  for (const i of installments) {
    const name = i.order.customer?.name ?? parseJson<{ name?: string }>(i.order.customerSnapshot, {}).name ?? "Cliente";
    const overdue = i.dueDate < now;
    items.push({
      id: `bol-${i.id}`, kind: "BOLETO",
      title: `Boleto ${overdue ? "vencido" : "a vencer"} — ${name}`,
      detail: `Pedido ${i.order.number}`, date: i.dueDate, overdue, amount: i.amount,
      link: "/backoffice/boletos",
    });
  }

  for (const e of expenses) {
    const overdue = e.dueDate < now;
    items.push({
      id: `exp-${e.id}`, kind: "DESPESA",
      title: `Despesa ${overdue ? "vencida" : "a vencer"} — ${e.name}${e.label ? ` (${e.label})` : ""}`,
      detail: "Contas a pagar", date: e.dueDate, overdue, amount: e.amount,
      link: "/backoffice/despesas",
    });
  }

  let remarketingCount = 0;
  for (const o of cardOrders) {
    const base = o.paidAt ?? o.createdAt;
    const lastDue = addMonths(base, o.cardInstallments ?? 1);
    if (lastDue <= now) {
      remarketingCount++;
      const name = o.customer?.name ?? parseJson<{ name?: string }>(o.customerSnapshot, {}).name ?? "Cliente";
      items.push({
        id: `rmk-${o.id}`, kind: "REMARKETING",
        title: `Remarketing — ${name}`,
        detail: `Terminou de pagar o cartão (pedido ${o.number}) — bom momento pra reabordar`,
        date: lastDue, overdue: false,
        link: "/backoffice/pedidos",
      });
    }
  }

  return {
    items,
    counts: {
      boletos: installments.length,
      despesas: expenses.length,
      remarketing: remarketingCount,
      pedidos: pendingOrders.length,
      total: installments.length + expenses.length + remarketingCount + pendingOrders.length,
    },
  };
}
