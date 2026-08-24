import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { MarcasManager, type BrandRow, type CollectionRow } from "@/components/backoffice/marcas-manager";

export const metadata: Metadata = { title: "Marcas & Coleções" };

export default async function MarcasPage() {
  await guardModule("marcas");

  const [brands, collections, productCounts] = await Promise.all([
    db.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.product.groupBy({ by: ["brand"], _count: { _all: true } }),
  ]);

  const countByBrand = new Map(productCounts.map((p) => [p.brand, p._count._all]));
  const collectionCounts = await db.product.groupBy({ by: ["collectionId"], _count: { _all: true } });
  const countByCollection = new Map(collectionCounts.map((p) => [p.collectionId, p._count._all]));

  const brandRows: BrandRow[] = brands.map((b) => ({
    id: b.id, name: b.name, tagline: b.tagline ?? "", blurb: b.blurb ?? "", accent: b.accent ?? "#C6FF00",
    active: b.active, sortOrder: b.sortOrder, productCount: countByBrand.get(b.name) ?? 0,
  }));
  const collectionRows: CollectionRow[] = collections.map((c) => ({
    id: c.id, name: c.name, description: c.description ?? "", active: c.active, sortOrder: c.sortOrder,
    productCount: countByCollection.get(c.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Marcas & Coleções"
        subtitle="Crie, edite e organize as marcas e coleções usadas no cadastro de produtos e na loja."
      />
      <MarcasManager brands={brandRows} collections={collectionRows} />
    </>
  );
}
