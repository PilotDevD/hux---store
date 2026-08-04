import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Shirt, Pencil } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/enums";
import { PageHeader, EmptyState } from "@/components/backoffice/bo-ui";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage() {
  await guardModule("produtos");
  const products = await db.product.findMany({
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

      {products.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Nenhum produto"
          hint="Cadastre seu primeiro produto para começar a vender."
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
