"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, User, Menu, X, Search } from "lucide-react";
import { Logo } from "./logo";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/loja", label: "Loja" },
  { href: "/colecoes", label: "Coleções" },
  { href: "/tecnologia", label: "Tecnologia" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader({ customerName }: { customerName: string | null }) {
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-[120] transition-colors duration-300",
        scrolled || mobileOpen
          ? "border-b border-line bg-graphite/90 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-hux flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <Link href="/" aria-label="HUX — início" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "link-underline text-sm font-semibold uppercase tracking-wide transition-colors",
                  active ? "text-orange" : "text-ink-soft hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            href="/loja"
            aria-label="Buscar"
            className="hidden size-10 place-items-center rounded-full text-ink-soft transition-colors hover:text-orange md:grid"
          >
            <Search size={19} />
          </Link>
          <Link
            href="/conta"
            aria-label={customerName ? `Conta de ${customerName}` : "Entrar"}
            className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:text-orange"
          >
            <User size={19} />
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir sacola"
            className="relative grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:text-orange"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-orange px-1 font-mono text-[0.62rem] font-bold text-void">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:text-orange lg:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          "overflow-hidden border-t border-line bg-graphite/95 backdrop-blur-xl transition-[max-height] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          mobileOpen ? "max-h-96" : "max-h-0 border-t-transparent",
        )}
      >
        <nav className="container-hux flex flex-col py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b border-line/60 py-3.5 text-lg font-semibold uppercase tracking-wide text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/conta" className="py-3.5 text-lg font-semibold uppercase tracking-wide text-orange">
            {customerName ? "Minha conta" : "Entrar / Cadastrar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
