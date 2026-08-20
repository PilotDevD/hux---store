import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, Undo2, ArrowLeftRight, Wallet, Boxes } from "lucide-react";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS, SIZE_LABELS, RETURN_TYPES, RETURN_TYPE_LABELS, type ProductType, type Size } from "@/lib/enums";
import { PageHeader, StatCard, EmptyState } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { TrocasManager } from "@/components/backoffice/trocas-manager";
import type { VariantOption } from "@/components/backoffice/vendas-manager";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Trocas & Devoluções" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TrocasPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("trocas");
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const type = first(sp.tipo);
  const de = first(sp.de);
  const ate = first(sp.ate);

  const where: Prisma.ReturnRequestWhereInput = {};
  if (type && (RETURN_TYPES as readonly string[]).includes(type)) where.type = type;
  if (q) where.OR = [
    { orderNumber: { contains: q, mode: "insensitive" } },
    { customerName: { contains: q, mode: "insensitive" } },
    { number: { contains: q, mode: "insensitive" } },
  ];
  if (de || ate) {
    where.createdAt = {};
    if (de) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(`${de}T00:00:00`);
    if (ate) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(`${ate}T23:59:59`);
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [returns, variants, monthReturns] = await Promise.all([
    db.returnRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { items: true } }),
    db.productVariant.findMany({
      where: { active: true, product: { active: true } },
      include: { product: { select: { name: true, type: true, basePrice: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.returnRequest.findMany({ where: { createdAt: { gte: monthStart } }, include: { items: true } }),
  ]);

  const variantOptions: VariantOption[] = variants.map((v) => ({
    id: v.id, stock: v.stock, price: v.priceOverride ?? v.product.basePrice,
    label: `${v.product.name} · ${SIZE_LABELS[v.size as Size] ?? v.size} · ${v.color} · ${PRODUCT_TYPE_LABELS[v.product.type as ProductType] ?? v.product.type} (${v.sku})`,
  }));

  const devolucoesMes = monthReturns.filter((r) => r.type === "DEVOLUCAO").length;
  const trocasMes = monthReturns.filter((r) => r.type === "TROCA").length;
  const reembolsadoMes = monthReturns.reduce((s, r) => s + r.refundAmount, 0);
  const itensMes = monthReturns.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty, 0), 0);

  const filters = [{ id: "", label: "Todos" }, ...RETURN_TYPES.map((t) => ({ id: t, label: RETURN_TYPE_LABELS[t] }))];

  return (
    <>
      <PageHeader
        eyebrow="Pós-venda"
        title="Trocas & Devoluções"
        subtitle="Busque a venda pelo código, escolha os itens e registre a troca ou devolução — o estoque é ajustado automaticamente."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Devoluções (mês)" value={String(devolucoesMes)} icon={Undo2} tone="negative" />
        <StatCard label="Trocas (mês)" value={String(trocasMes)} icon={ArrowLeftRight} tone="info" />
        <StatCard label="Reembolsado (mês)" value={formatCents(reembolsadoMes)} icon={Wallet} tone="warning" />
        <StatCard label="Itens ao estoque (mês)" value={String(itensMes)} icon={Boxes} tone="positive" />
      </div>

      <TrocasManager variants={variantOptions} />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((tf) => (
          <Link
            key={tf.id || "all"}
            href={tf.id ? `/backoffice/trocas?tipo=${tf.id}` : "/backoffice/trocas"}
            className={`chip transition-colors ${(type ?? "") === tf.id ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft"}`}
          >
            {tf.label}
          </Link>
        ))}
      </div>

      <BoFilterBar searchPlaceholder="Buscar por venda, cliente ou nº da troca…" dateRange />

      {returns.length === 0 ? (
        <EmptyState icon={RefreshCw} title="Nenhuma troca ou devolução" hint="Clique em “Nova troca / devolução”, busque a venda pelo código e selecione os itens." />
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const isTroca = r.type === "TROCA";
            return (
              <div key={r.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{r.number}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.62rem] uppercase ${isTroca ? "border-info/40 bg-info/10 text-info" : "border-negative/40 bg-negative/10 text-negative"}`}>
                      {RETURN_TYPE_LABELS[r.type]}
                    </span>
                    <Link href={`/backoffice/pedidos/${r.orderNumber}`} className="font-mono text-xs text-ink-soft hover:text-orange">venda {r.orderNumber}</Link>
                  </div>
                  <div className="text-right">
                    {r.refundAmount > 0 && <p className="text-sm font-semibold text-negative">Reembolso {formatCents(r.refundAmount)}</p>}
                    {isTroca && (
                      <p className={`text-sm font-semibold ${r.exchangeDiff >= 0 ? "text-positive" : "text-warning"}`}>
                        {r.exchangeDiff >= 0 ? `+${formatCents(r.exchangeDiff)} cobrado` : `${formatCents(-r.exchangeDiff)} devolvido`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-line">
                  {r.items.map((it) => (
                    <div key={it.id} className="px-5 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted">{it.qty}×</span>
                        <span className="min-w-0 truncate">{it.productName} <span className="text-muted">({it.size}/{it.color})</span></span>
                      </div>
                      {it.mode === "TROCAR" && it.newProductName && (
                        <p className="ml-6 mt-0.5 flex items-center gap-1.5 text-xs text-info">
                          <ArrowLeftRight size={12} /> trocado por {it.newProductName} ({it.newSize}/{it.newColor})
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-line px-5 py-2.5 text-xs text-muted">
                  <span className="text-ink-soft">{r.customerName}</span> · {formatDateTime(r.createdAt)}
                  {r.handledByName ? ` · por ${r.handledByName}` : ""} · <span className="italic">“{r.reason}”</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
