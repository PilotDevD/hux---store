import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth";
import { ProfileForm, PasswordForm } from "@/components/account/profile-forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const customer = await requireCustomer();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Conta</p>
        <h1 className="headline text-3xl md:text-4xl">Meu perfil</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileForm name={customer.name} email={customer.email} phone={customer.phone ?? ""} />
        <PasswordForm />
      </div>
    </div>
  );
}
