import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardModule } from "@/lib/bo-guard";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { ConfeccaoManager, type MaterialRow, type JobRow } from "@/components/backoffice/confeccao-manager";

export const metadata: Metadata = { title: "Confecção" };

export default async function ConfeccaoPage() {
  await guardModule("confeccao");
  const [materials, jobs] = await Promise.all([
    db.rawMaterial.findMany({ orderBy: { createdAt: "desc" } }),
    db.productionJob.findMany({ orderBy: [{ phase: "asc" }, { createdAt: "desc" }] }),
  ]);

  const matRows: MaterialRow[] = materials.map((m) => ({
    id: m.id, name: m.name, color: m.color, supplier: m.supplier, quantity: m.quantity,
    unit: m.unit, totalCost: m.totalCost, yieldPieces: m.yieldPieces, notes: m.notes,
  }));
  const jobRows: JobRow[] = jobs.map((j) => ({
    id: j.id, rawMaterialId: j.rawMaterialId, brand: j.brand, productType: j.productType,
    modelName: j.modelName, color: j.color, size: j.size, qty: j.qty, forCustomerName: j.forCustomerName,
    phase: j.phase, unitCost: j.unitCost, dueDate: j.dueDate?.toISOString() ?? null, notes: j.notes,
  }));

  return (
    <>
      <PageHeader eyebrow="Produção própria" title="Confecção" subtitle="Matéria-prima, custeio e acompanhamento das peças em produção." />
      <ConfeccaoManager materials={matRows} jobs={jobRows} />
    </>
  );
}
