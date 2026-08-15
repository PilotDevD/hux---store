import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { History } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/backoffice/bo-ui";
import { Badge } from "@/components/ui/badge";
import { BoFilterBar } from "@/components/backoffice/bo-filter-bar";

export const metadata: Metadata = { title: "Auditoria" };

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const ACTION_TONE: Record<string, "success" | "danger" | "info" | "warning" | "neutral"> = {
  CREATE: "success", UPDATE: "info", DELETE: "danger", STATUS: "info",
  PAYMENT: "success", STOCK: "warning", SEND: "info", LOGIN: "neutral", SALE: "success",
};

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardModule("auditoria");
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const entity = first(sp.entity);
  const action = first(sp.action);
  const de = first(sp.de);
  const ate = first(sp.ate);

  const where: Prisma.AuditLogWhereInput = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (q) where.OR = [{ summary: { contains: q, mode: "insensitive" } }, { actorName: { contains: q, mode: "insensitive" } }];
  if (de || ate) {
    where.createdAt = {};
    if (de) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(de);
    if (ate) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(`${ate}T23:59:59`);
  }

  const [logs, entities, actions] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Rastreabilidade" title="Auditoria" subtitle="Histórico completo de ações no sistema — quem fez o quê e quando." />

      <BoFilterBar
        searchPlaceholder="Buscar por descrição ou usuário…"
        dateRange
        selects={[
          { param: "entity", label: "Módulo", options: entities.map((e) => ({ value: e.entity, label: e.entity })) },
          { param: "action", label: "Ação", options: actions.map((a) => ({ value: a.action, label: a.action })) },
        ]}
      />

      {logs.length === 0 ? (
        <EmptyState icon={History} title="Sem registros" hint="As ações realizadas no painel aparecerão aqui." />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[150px_120px_1fr_160px] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
            <span>Data</span><span>Ação</span><span>Descrição</span><span>Usuário</span>
          </div>
          <div className="divide-y divide-line">
            {logs.map((l) => (
              <div key={l.id} className="grid grid-cols-1 gap-1 px-5 py-3 md:grid-cols-[150px_120px_1fr_160px] md:items-center md:gap-4">
                <span className="font-mono text-xs text-muted">{formatDateTime(l.createdAt)}</span>
                <span><Badge tone={ACTION_TONE[l.action] ?? "neutral"}>{l.action}</Badge> <span className="text-xs text-faint md:hidden">{l.entity}</span></span>
                <span className="text-sm text-ink-soft">{l.summary}</span>
                <span className="truncate text-xs text-muted">{l.actorName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-center font-mono text-xs text-faint">Mostrando os {logs.length} registros mais recentes.</p>
    </>
  );
}
