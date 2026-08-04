import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountNav } from "@/components/account/account-nav";
import { initials } from "@/lib/utils";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer();
  if (!customer) redirect("/conta/login");

  const unread = await db.notification.count({
    where: { customerId: customer.id, read: false },
  });

  return (
    <div className="container-hux py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-5 flex items-center gap-3 border-b border-line pb-5">
            <div className="grid size-11 place-items-center rounded-full bg-orange font-display text-lg text-void">
              {initials(customer.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{customer.name}</p>
              <p className="truncate text-xs text-muted">{customer.email}</p>
            </div>
          </div>
          <AccountNav unread={unread} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
