import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { canAccessModule } from "@/lib/access";
import { MODULES, CONFIG_MODULE } from "@/lib/enums";
import { BoNav, BoMobileNav } from "@/components/backoffice/bo-nav";

export default async function BackofficePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaff();
  if (!staff) redirect("/backoffice/login");

  const allIds = [...MODULES.map((m) => m.id), CONFIG_MODULE.id];
  const allowed = allIds.filter((id) =>
    canAccessModule(staff.role, staff.permissions, id as never),
  );

  return (
    <div className="min-h-screen bg-graphite lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 z-40 hidden h-screen border-r border-line bg-void lg:block">
        <BoNav allowed={allowed} user={{ name: staff.displayName, role: staff.role }} />
      </aside>

      {/* Mobile top nav */}
      <div className="sticky top-0 z-40 border-b border-line bg-void lg:hidden">
        <BoMobileNav allowed={allowed} user={{ name: staff.displayName, role: staff.role }} />
      </div>

      <main className="min-w-0 px-5 py-8 md:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
