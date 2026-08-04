"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Shirt, Boxes, Percent, Ticket,
  Users, Bell, Truck, Settings, LogOut, ExternalLink,
  Barcode, Bookmark, ClipboardList,
} from "lucide-react";
import { staffLogoutAction } from "@/app/actions/staff-auth";
import { Logo } from "@/components/site/logo";
import { ROLE_LABELS, type Role } from "@/lib/enums";
import { initials, cn } from "@/lib/utils";

const NAV: { id: string; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", href: "/backoffice", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", href: "/backoffice/pedidos", icon: ShoppingCart },
  { id: "boletos", label: "Boletos", href: "/backoffice/boletos", icon: Barcode },
  { id: "reservas", label: "Reservas", href: "/backoffice/reservas", icon: Bookmark },
  { id: "encomendas", label: "Encomendas", href: "/backoffice/encomendas", icon: ClipboardList },
  { id: "produtos", label: "Produtos", href: "/backoffice/produtos", icon: Shirt },
  { id: "estoque", label: "Estoque", href: "/backoffice/estoque", icon: Boxes },
  { id: "promocoes", label: "Promoções", href: "/backoffice/promocoes", icon: Percent },
  { id: "cupons", label: "Cupons", href: "/backoffice/cupons", icon: Ticket },
  { id: "clientes", label: "Clientes", href: "/backoffice/clientes", icon: Users },
  { id: "notificacoes", label: "Notificações", href: "/backoffice/notificacoes", icon: Bell },
  { id: "frete", label: "Frete", href: "/backoffice/frete", icon: Truck },
  { id: "config", label: "Configurações", href: "/backoffice/config", icon: Settings },
];

export function BoNav({
  allowed,
  user,
}: {
  allowed: string[];
  user: { name: string; role: Role };
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => allowed.includes(n.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <Link href="/backoffice"><Logo /></Link>
        <span className="chip border-orange/40 text-orange">Gestão</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = item.href === "/backoffice"
            ? pathname === "/backoffice"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-orange/10 text-orange" : "text-ink-soft hover:bg-elevated hover:text-ink",
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/"
          target="_blank"
          className="mb-2 flex items-center gap-2 rounded-[var(--radius)] px-3.5 py-2 text-xs text-muted transition-colors hover:text-ink"
        >
          <ExternalLink size={14} /> Ver loja
        </Link>
        <div className="flex items-center gap-3 rounded-[var(--radius)] bg-elevated px-3 py-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-orange font-display text-sm text-void">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action={staffLogoutAction}>
            <button type="submit" aria-label="Sair" className="text-faint transition-colors hover:text-negative">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function BoMobileNav({ allowed, user }: { allowed: string[]; user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => allowed.includes(n.id));
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/backoffice"><Logo /></Link>
        <form action={staffLogoutAction}>
          <button type="submit" aria-label="Sair" className="flex items-center gap-2 text-xs text-muted hover:text-negative">
            <div className="grid size-8 place-items-center rounded-full bg-orange font-display text-xs text-void">
              {initials(user.name)}
            </div>
            <LogOut size={15} />
          </button>
        </form>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 [scrollbar-width:none]">
        {items.map((item) => {
          const active = item.href === "/backoffice" ? pathname === "/backoffice" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-orange/10 text-orange" : "text-ink-soft hover:bg-elevated",
              )}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
