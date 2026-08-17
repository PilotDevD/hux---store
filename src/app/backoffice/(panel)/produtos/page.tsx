import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Shirt, Pencil } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { BRANDS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/enums";
import { PageHeader, EmptyState } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Produtos" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("produtos");
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const brand = first(sp.brand);
  const type = first(sp.tipo);
  const status = first(sp.status);

  const where: Prisma.ProductWhereInput = {};
  if (brand) where.brand = brand;
  if (type) where.type = type;
  if (status === "ativo") where.active = true;
  if (status === "inativo") where.active = false;
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { modelName: { contains: q, mode: "insensitive" } },
    { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
  ];

  const products = await db.product.findMany({
    where,
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { variants: true, collection: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <Link href="/backoffice/produtos/novo" className="btn btn-primary">
            <Plus size={16} /> Novo produto
          </Link>
        }
      />

      <BoFilterBar
        searchPlaceholder="Buscar por nome, modelo ou SKU…"
        selects={[
          { param: "brand", label: "Marca", options: BRANDS.map((b) => ({ value: b, label: b })) },
          { param: "tipo", label: "Tipo", options: PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] })) },
          { param: "status", label: "Situação", options: [{ value: "ativo", label: "Ativos" }, { value: "inativo", label: "Inativos" }] },
        ]}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Nenhum produto encontrado"
          hint="Ajuste os filtros ou cadastre um novo produto."
          action={<Link href="/backoffice/produtos/novo" className="btn btn-primary mt-1"><Plus size={16} /> Novo produto</Link>}
        />
      ) : (
        <div className="card divide-y divide-line">
          {products.map((p) => {
            const images = parseJson<string[]>(p.images, []);
            const stock = p.variants.reduce((s, v) => s + v.stock, 0);
            return (
              <Link
                key={p.id}
                href={`/backoffice/produtos/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-elevated"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-void">
                  {images[0] && <Image src={images[0]} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{p.name}</p>
                    {!p.active && <Badge tone="danger">Inativo</Badge>}
                    {p.featured && <Badge tone="warning">Destaque</Badge>}
                  </div>
                  <p className="font-mono text-xs text-muted">
                    {p.brand} · {PRODUCT_TYPE_LABELS[p.type as ProductType] ?? p.type} · {p.variants.length} variantes
                    {p.supplierCode ? ` · forn. ${p.supplierCode}` : ""}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-semibold">{formatCents(p.basePrice)}</p>
                  <p className={`font-mono text-xs ${stock <= 3 ? "text-warning" : "text-muted"}`}>{stock} un</p>
                </div>
                <Pencil size={15} className="text-faint" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
