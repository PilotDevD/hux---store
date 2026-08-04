"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Package, Tag, Info, CheckCheck } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/account";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Notif = {
  id: string; type: string; title: string; body: string;
  link: string | null; read: boolean; createdAt: Date;
};

const ICONS: Record<string, typeof Bell> = {
  PEDIDO: Package,
  PROMO: Tag,
  SISTEMA: Info,
};

export function NotificationsList({ notifications }: { notifications: Notif[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const hasUnread = notifications.some((n) => !n.read);

  function open(n: Notif) {
    if (!n.read) {
      start(async () => {
        await markNotificationReadAction(n.id);
        router.refresh();
      });
    }
    if (n.link) router.push(n.link);
  }

  function markAll() {
    start(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <div className="grid size-14 place-items-center rounded-full border border-line">
          <Bell size={22} className="text-faint" />
        </div>
        <p className="text-muted">Nenhuma notificação por aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <button
            onClick={markAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:underline disabled:opacity-50"
          >
            <CheckCheck size={15} /> Marcar todas como lidas
          </button>
        </div>
      )}
      <div className="card divide-y divide-line">
        {notifications.map((n) => {
          const Icon = ICONS[n.type] ?? Info;
          const Wrapper = n.link ? "button" : "div";
          return (
            <Wrapper
              key={n.id}
              onClick={n.link || !n.read ? () => open(n) : undefined}
              className={cn(
                "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors",
                !n.read && "bg-orange/[0.04]",
                (n.link || !n.read) && "hover:bg-surface",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border",
                  n.read ? "border-line text-faint" : "border-orange/40 text-orange",
                )}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("font-semibold", !n.read && "text-ink")}>{n.title}</p>
                  {!n.read && <span className="size-2 shrink-0 rounded-full bg-orange" />}
                </div>
                <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                <p className="mt-1 font-mono text-[0.66rem] text-faint">{formatDateTime(n.createdAt)}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
