import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { parseJson } from "@/lib/utils";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { MaquininhasManager, type MachineRow } from "@/components/backoffice/maquininhas-manager";
import type { InstallmentFee } from "@/lib/card-machine-fee";

export const metadata: Metadata = { title: "Maquininhas" };

export default async function MaquininhasPage() {
  await guardModule("maquininhas");
  const machines = await db.cardMachine.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  const rows: MachineRow[] = machines.map((m) => ({
    id: m.id, name: m.name, provider: m.provider,
    debitFee: m.debitFee, creditFee: m.creditFee, pixFee: m.pixFee,
    installmentFees: parseJson<InstallmentFee[]>(m.installmentFees, []),
    notes: m.notes, active: m.active,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Maquininhas"
        subtitle="Cadastre suas maquininhas e as taxas por forma de pagamento e parcelas. Ao registrar uma venda no cartão, o sistema mostra o valor líquido que você recebe."
      />
      <MaquininhasManager machines={rows} />
    </>
  );
}
