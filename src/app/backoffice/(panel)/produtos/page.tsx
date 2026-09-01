import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import {
  PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZES, SIZE_LABELS, GENDERS, GENDER_LABELS,
  type ProductType,
} from "@/lib/enums";
import { getBrandNames } from "@/lib/brands";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";
import { ProductsList, type ProductListItem } from "@/components/backoffice/products-list";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Produtos" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("produtos");
  const sp = await searchParams;
  const brand = first(sp.brand);
  const type = first(sp.tipo);
  const gender = first(sp.genero);
  const size = first(sp.tamanho);
  const status = first(sp.status);

  const where: Prisma.ProductWhereInput = {};
  if (brand) where.brand = brand;
  if (type) where.type = type;
  if (gender) where.gender = gender;
  // Size filter = "available in this size" (has an active variant with stock).
  if (size) where.variants = { some: { size, active: true, stock: { gt: 0 } } };
  if (status === "ativo") where.active = true;
  if (status === "inativo") where.active = false;

  const [products, brandNames] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: { variants: true, collection: { select: { name: true } } },
    }),
    getBrandNames(),
  ]);

  const sizeLabel = size ? SIZE_LABELS[size as keyof typeof SIZE_LABELS] ?? size : "";

  const items: ProductListItem[] = products.map((p) => {
    const images = parseJson<string[]>(p.images, []);
    const activeVariants = p.variants.filter((v) => v.active);
    // When filtering by size, show the stock for THAT size (not the total).
    const stock = size
      ? activeVariants.filter((v) => v.size === size).reduce((s, v) => s + v.stock, 0)
      : activeVariants.reduce((s, v) => s + v.stock, 0);
    const typeLabel = PRODUCT_TYPE_LABELS[p.type as ProductType] ?? p.type;
    const searchText = [
      p.name, p.brand, p.modelName ?? "", typeLabel, p.collection?.name ?? "", p.supplierCode ?? "",
      ...activeVariants.map((v) => `${v.sku} ${v.color} ${v.size}`),
    ].join(" ").toLowerCase();
    return {
      id: p.id, name: p.name, brand: p.brand, typeLabel,
      image: images[0] ?? null, price: p.basePrice, stock, variantsCount: activeVariants.length,
      active: p.active, featured: p.featured, supplierCode: p.supplierCode ?? null, searchText,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        subtitle={`${products.length} produtos${size ? ` disponíveis no tamanho ${sizeLabel}` : " cadastrados"}`}
        action={
          <Link href="/backoffice/produtos/novo" className="btn btn-primary">
            <Plus size={16} /> Novo produto
          </Link>
        }
      />

      <BoFilterBar
        noSearch
        selects={[
          { param: "brand", label: "Marca", options: brandNames.map((b) => ({ value: b, label: b })) },
          { param: "tipo", label: "Tipo", options: PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] })) },
          { param: "genero", label: "Gênero", options: GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] })) },
          { param: "tamanho", label: "Tamanho", options: SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] })) },
          { param: "status", label: "Situação", options: [{ value: "ativo", label: "Ativos" }, { value: "inativo", label: "Inativos" }] },
        ]}
      />

      <ProductsList products={items} sizeFilter={sizeLabel} />
    </>
  );
}
