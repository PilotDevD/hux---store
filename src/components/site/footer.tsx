import Link from "next/link";
import { Instagram, Youtube, ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";
import { Marquee } from "./marquee";
import { NewsletterForm } from "./newsletter-form";

const COLS = [
  {
    title: "Loja",
    links: [
      { href: "/loja", label: "Todos os produtos" },
      { href: "/loja?genero=MASCULINO", label: "Masculino" },
      { href: "/loja?genero=FEMININO", label: "Feminino" },
      { href: "/colecoes", label: "Coleções" },
      { href: "/loja?promo=1", label: "Promoções" },
    ],
  },
  {
    title: "Marca",
    links: [
      { href: "/sobre", label: "Sobre a HUX" },
      { href: "/tecnologia", label: "Tecnologia" },
      { href: "/contato", label: "Contato" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/conta", label: "Entrar" },
      { href: "/conta/cadastro", label: "Criar conta" },
      { href: "/conta/pedidos", label: "Meus pedidos" },
    ],
  },
];

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="relative mt-24 border-t border-line bg-void">
      <Marquee
        items={["RUN", "PERFORMANCE", "LIFESTYLE", "RUN", "PERFORMANCE", "LIFESTYLE"]}
        className="border-b border-line py-4 font-display text-2xl uppercase text-ink md:text-3xl"
      />

      <div className="container-hux grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo className="mb-5" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Vestuário técnico de corrida. Feito para a distância, a velocidade e a rua.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-orange hover:text-orange"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-orange hover:text-orange"
            >
              <Youtube size={18} />
            </a>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-orange"
                    >
                      {l.label}
                      <ArrowUpRight
                        size={13}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container-hux pb-16">
        <div className="card grid gap-6 p-8 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="headline text-2xl">Entre no pelotão</h3>
            <p className="mt-1 text-sm text-muted">
              Lançamentos, drops e treinos direto no seu e-mail.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-hux flex flex-col items-center justify-between gap-3 py-6 text-xs text-faint md:flex-row">
          <p>© {year} HUX RUN. Todos os direitos reservados.</p>
          <div className="flex items-center gap-5">
            <Link href="/politica-de-privacidade" className="hover:text-ink-soft">
              Privacidade
            </Link>
            <Link href="/trocas-e-devolucoes" className="hover:text-ink-soft">
              Trocas & Devoluções
            </Link>
            <Link href="/backoffice" className="font-mono uppercase tracking-wider hover:text-orange">
              Gestão
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
