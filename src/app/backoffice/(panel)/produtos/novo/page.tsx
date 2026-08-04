import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { ProductForm } from "@/components/backoffice/product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await guardModule("produtos");
  const collections = await db.collection.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <Link href="/backoffice/produtos" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <PageHeader eyebrow="Catálogo" title="Novo produto" />
      <ProductForm collections={collections} />
    </>
  );
}
