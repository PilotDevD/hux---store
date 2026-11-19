import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { getBrandNames } from "@/lib/brands";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { ProductForm } from "@/components/backoffice/product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  const staff = await guardModule("produtos");
  // Vendedores podem editar produtos, mas não criar novos.
  if (staff.role === "VENDEDOR") redirect("/backoffice/produtos");
  const [collections, brands] = await Promise.all([
    db.collection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getBrandNames(),
  ]);

  return (
    <>
      <Link href="/backoffice/produtos" className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-orange">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <PageHeader eyebrow="Catálogo" title="Novo produto" />
      <ProductForm collections={collections} brands={brands} />
    </>
  );
}
