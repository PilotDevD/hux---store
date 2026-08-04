import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificationsList } from "@/components/account/notifications-list";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const customer = await requireCustomer();
  const notifications = await db.notification.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Central</p>
        <h1 className="headline text-3xl md:text-4xl">Notificações</h1>
      </div>
      <NotificationsList
        notifications={notifications.map((n) => ({
          id: n.id, type: n.type, title: n.title, body: n.body,
          link: n.link, read: n.read, createdAt: n.createdAt,
        }))}
      />
    </div>
  );
}
