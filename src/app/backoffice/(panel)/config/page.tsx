import type { Metadata } from "next";
import { guardModule } from "@/lib/bo-guard";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { formatCentsPlain } from "@/lib/money";
import { PageHeader } from "@/components/backoffice/bo-ui";
import { UsersManager, type UserRow } from "@/components/backoffice/users-manager";
import { SettingsForm } from "@/components/backoffice/settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfigPage() {
  await guardModule("config");
  const [users, setting] = await Promise.all([
    db.user.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { displayName: "asc" }] }),
    db.setting.findUnique({ where: { key: "store" } }),
  ]);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id, username: u.username, displayName: u.displayName, role: u.role,
    commissionPct: u.commissionPct, permissions: parseJson<string[]>(u.permissions, []), active: u.active,
  }));

  const store = parseJson<{ freeShippingThreshold?: number; supportEmail?: string; supportPhone?: string; pixKey?: string }>(
    setting?.value ?? "{}", {},
  );

  return (
    <>
      <PageHeader eyebrow="Administração" title="Configurações" subtitle="Usuários da equipe e parâmetros da loja. Exclusivo do administrador." />
      <div className="space-y-10">
        <SettingsForm
          initial={{
            freeShippingThreshold: store.freeShippingThreshold ? formatCentsPlain(store.freeShippingThreshold) : "",
            supportEmail: store.supportEmail ?? "",
            supportPhone: store.supportPhone ?? "",
            pixKey: store.pixKey ?? "",
          }}
        />
        <UsersManager users={rows} />
      </div>
    </>
  );
}
