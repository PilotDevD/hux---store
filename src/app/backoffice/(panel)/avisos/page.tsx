import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { AvisosManager, type AvisoGroup } from "@/components/backoffice/avisos-manager";

export const metadata: Metadata = { title: "Avise-me" };

export default async function AvisosPage() {
  await guardModule("avisos");

  const requests = await db.stockNotifyRequest.findMany({
    where: { notified: false },
    orderBy: { createdAt: "desc" },
  });

  const productIds = [...new Set(requests.map((r) => r.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, variants: { select: { stock: true } } },
  });
  const stockById = new Map(products.map((p) => [p.id, p.variants.reduce((s, v) => s + v.stock, 0)]));

  const map = new Map<string, AvisoGroup>();
  for (const r of requests) {
    const g = map.get(r.productId) ?? { productId: r.productId, productName: r.productName, count: 0, emails: [], inStock: (stockById.get(r.productId) ?? 0) > 0 };
    g.count += 1;
    if (!g.emails.includes(r.email)) g.emails.push(r.email);
    map.set(r.productId, g);
  }
  const groups = [...map.values()].sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.count - a.count);

  return (
    <>
      <PageHeader eyebrow="Demanda" title="Avise-me quando voltar" subtitle="Clientes que pediram aviso de reposição. Ao repor o estoque, notifique-os com um clique." />
      <AvisosManager groups={groups} />
    </>
  );
}
