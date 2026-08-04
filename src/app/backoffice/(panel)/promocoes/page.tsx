import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { PromotionsManager, type PromoRow } from "@/components/backoffice/promotions-manager";

export const metadata: Metadata = { title: "Promoções" };

export default async function PromocoesPage() {
  await guardModule("promocoes");
  const [promotions, collections, products] = await Promise.all([
    db.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { products: { select: { id: true } } } }),
    db.collection.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, brand: true } }),
  ]);

  const rows: PromoRow[] = promotions.map((p) => ({
    id: p.id, name: p.name, type: p.type, value: p.value, scope: p.scope,
    targetBrand: p.targetBrand, collectionId: p.collectionId, active: p.active,
    startsAt: p.startsAt?.toISOString() ?? null, endsAt: p.endsAt?.toISOString() ?? null,
    productIds: p.products.map((x) => x.id),
  }));

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Promoções" subtitle="Descontos automáticos aplicados na vitrine e no carrinho." />
      <PromotionsManager promotions={rows} collections={collections} products={products} />
    </>
  );
}
