import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { Badge } from "@/components/ui/badge";
import { NotificationSender } from "@/components/backoffice/notification-sender";

export const metadata: Metadata = { title: "Notificações" };

const typeTone: Record<string, "info" | "warning" | "neutral"> = {
  PROMO: "warning", PEDIDO: "info", SISTEMA: "neutral",
};

export default async function NotificacoesPage() {
  await guardModule("notificacoes");
  const [customers, recent] = await Promise.all([
    db.customer.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Engajamento" title="Notificações" subtitle="Envie avisos e promoções para os clientes." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <NotificationSender customers={customers} />

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <Bell size={16} className="text-orange" />
            <h2 className="headline text-lg">Enviadas recentemente</h2>
          </div>
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Nenhuma notificação enviada.</p>
          ) : (
            <div className="max-h-[540px] divide-y divide-line overflow-y-auto">
              {recent.map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={typeTone[n.type] ?? "neutral"}>{n.type}</Badge>
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{n.body}</p>
                  <p className="mt-1 font-mono text-[0.66rem] text-faint">
                    {n.customer.name} · {formatDateTime(n.createdAt)} {n.read ? "· lida" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
