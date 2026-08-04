import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { formatCentsPlain } from "@/lib/money";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { ProductForm, type ProductFormInitial } from "@/components/backoffice/product-form";

export const metadata: Metadata = { title: "Editar produto" };

const reais = (cents: number | null | undefined) => (cents ? formatCentsPlain(cents) : "");

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("produtos");
  const { id } = await params;

  const [product, collections] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { createdAt: "asc" } } } }),
    db.collection.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductFormInitial = {
    id: product.id,
    brand: product.brand,
    name: product.name,
    modelName: product.modelName ?? "",
    type: product.type,
    gender: product.gender,
    description: product.description ?? "",
    details: product.details ?? "",
    basePrice: reais(product.basePrice),
    compareAtPrice: reais(product.compareAtPrice),
    collectionId: product.collectionId ?? "",
    featured: product.featured,
    active: product.active,
    images: parseJson<string[]>(product.images, []).join("\n"),
    variants: product.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex ?? "#22262E",
        stock: String(v.stock),
        cost: reais(v.cost),
        priceOverride: reais(v.priceOverride),
      })),
  };

  return (
    <>
      <Link href="/backoffice/produtos" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <PageHeader eyebrow="Catálogo" title={product.name} subtitle={`${product.brand} · ${product.slug}`} />
      <ProductForm initial={initial} collections={collections} />
    </>
  );
}
