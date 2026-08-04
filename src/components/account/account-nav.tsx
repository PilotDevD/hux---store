"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, MapPin, Bell, User, LogOut } from "lucide-react";
import { logoutCustomerAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/conta", label: "Painel", icon: LayoutGrid, exact: true },
  { href: "/conta/pedidos", label: "Pedidos", icon: Package },
  { href: "/conta/enderecos", label: "Endereços", icon: MapPin },
  { href: "/conta/notificacoes", label: "Notificações", icon: Bell, badge: true },
  { href: "/conta/perfil", label: "Perfil", icon: User },
];

export function AccountNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-orange/10 text-orange" : "text-ink-soft hover:bg-surface hover:text-ink",
            )}
          >
            <item.icon size={17} />
            {item.label}
            {item.badge && unread > 0 && (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-orange px-1 font-mono text-[0.6rem] text-void">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      <form action={logoutCustomerAction} className="lg:mt-2 lg:border-t lg:border-line lg:pt-2">
        <button
          type="submit"
          className="flex w-full shrink-0 items-center gap-3 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-negative"
        >
          <LogOut size={17} />
          Sair
        </button>
      </form>
    </nav>
  );
}
