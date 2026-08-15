import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { NotaFiscalClient } from "@/components/backoffice/nota-fiscal-client";

export const metadata: Metadata = { title: "Nota Fiscal IA" };

export default async function NotaFiscalPage() {
  await guardModule("notafiscal");
  return (
    <>
      <PageHeader
        eyebrow="Entrada de estoque"
        title="Nota Fiscal com IA"
        subtitle="Envie a foto da nota do fornecedor — a IA extrai os itens e você dá entrada no estoque."
      />
      <NotaFiscalClient />
    </>
  );
}
