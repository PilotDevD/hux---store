import "server-only";
import { db } from "./db";

type Actor = { id: string; displayName: string } | null | undefined;

/**
 * Records an audit-trail entry. Never throws — auditing must not break the
 * underlying action. Call from every backoffice mutation.
 */
export async function logAudit(opts: {
  staff?: Actor;
  actorType?: "STAFF" | "CUSTOMER" | "SYSTEM";
  actorName?: string;
  action: string; // CREATE | UPDATE | DELETE | STATUS | PAYMENT | LOGIN | STOCK | SEND | ...
  entity: string; // Produto | Pedido | Cupom | Estoque | ...
  entityId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorType: opts.actorType ?? (opts.staff ? "STAFF" : "SYSTEM"),
        actorId: opts.staff?.id ?? null,
        actorName: opts.actorName ?? opts.staff?.displayName ?? "Sistema",
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        summary: opts.summary,
        meta: JSON.stringify(opts.meta ?? {}),
      },
    });
  } catch {
    /* swallow — auditing is best-effort */
  }
}
