import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target, Recycle, HeartPulse, Sparkles } from "lucide-react";
import { BRANDS, BRAND_INFO } from "@/lib/enums";
import { SectionHeading } from "@/components/site/section-heading";
import { Marquee } from "@/components/site/marquee";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Sobre",
  description: "A HUX nasceu da rua. Vestuário técnico de corrida com quatro marcas e uma obsessão: performance real.",
};

const VALUES = [
  { icon: Target, t: "Feito para a rua", d: "Testamos cada peça em treino real, na chuva, no calor, na subida. Nada de laboratório." },
  { icon: HeartPulse, t: "Performance honesta", d: "Sem promessas mágicas. Tecido bom, corte certo, costura que aguenta." },
  { icon: Recycle, t: "Consciência", d: "Materiais reciclados quando possível e produção interna que reduz desperdício." },
  { icon: Sparkles, t: "Comunidade", d: "Corremos junto. A HUX é feita com e para quem calça o tênis toda manhã." },
];

export default function SobrePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="glow-orange absolute -right-20 top-0 h-96 w-96 opacity-60" />
        <div className="container-hux relative z-[1] py-20 md:py-28">
          <p className="eyebrow mb-4 flex items-center gap-2"><span className="inline-block h-px w-8 bg-orange" /> Nossa história</p>
          <h1 className="display-hero text-6xl sm:text-7xl md:text-8xl">
            Nascemos
            <br />
            <span className="text-orange">na rua.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            A HUX começou com uma frustração simples: roupa de corrida cara demais, técnica de menos.
            Decidimos fazer diferente — peças que respiram, secam e aguentam o quilômetro, no preço de quem
            corre de verdade. Hoje reunimos quatro marcas sob o mesmo teto, cada uma com um propósito.
          </p>
        </div>
      </section>

      <Marquee
        items={["DESDE 2026", "SÃO PAULO", "FEITO NO BRASIL", "RUN CLUB", "PERFORMANCE REAL"]}
        className="border-b border-line bg-void py-4 font-display text-xl uppercase text-line"
      />

      {/* Stats */}
      <section className="container-hux grid gap-8 py-16 sm:grid-cols-3 md:py-20">
        {[
          { n: "4", l: "Marcas sob o mesmo DNA" },
          { n: "100%", l: "Testado em treino real" },
          { n: "1", l: "Obsessão: performance" },
        ].map((s, i) => (
          <Reveal key={s.l} delay={i * 100} className="text-center">
            <p className="font-display text-6xl text-orange md:text-7xl">{s.n}</p>
            <p className="data-label mt-2 text-muted">{s.l}</p>
          </Reveal>
        ))}
      </section>

      {/* Values */}
      <section className="border-y border-line bg-void">
        <div className="container-hux py-16 md:py-24">
          <Reveal><SectionHeading eyebrow="No que acreditamos" title="Nossos valores" /></Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.t} delay={i * 80}>
                <div className="card h-full p-6">
                  <v.icon size={26} className="text-orange" />
                  <h3 className="mt-5 font-semibold uppercase tracking-wide">{v.t}</h3>
                  <p className="mt-2 text-sm text-muted">{v.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="container-hux py-16 md:py-24">
        <Reveal><SectionHeading eyebrow="Casa de marcas" title="Quatro caminhos" link="/loja" linkLabel="Ver a loja" /></Reveal>
        <div className="mt-12 space-y-3">
          {BRANDS.map((brand, i) => {
            const info = BRAND_INFO[brand];
            return (
              <Reveal key={brand} delay={i * 60}>
                <Link href={`/loja?marca=${brand}`} className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line p-6 transition-colors hover:border-[color:var(--a)] md:flex-row md:items-center md:gap-8" style={{ ["--a" as string]: info.accent }}>
                  <span className="font-display text-4xl uppercase md:w-48 md:text-5xl">{brand}</span>
                  <span className="chip w-fit" style={{ borderColor: `${info.accent}66`, color: info.accent }}>{info.tagline}</span>
                  <p className="flex-1 text-sm text-muted">{info.blurb}</p>
                  <ArrowRight size={20} className="hidden text-faint transition-transform group-hover:translate-x-1 md:block" style={{ color: info.accent }} />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container-hux pb-24 text-center">
        <Reveal>
          <p className="mx-auto max-w-3xl font-display text-4xl uppercase leading-[0.95] sm:text-5xl md:text-6xl">
            Bora correr <span className="text-orange">com a gente?</span>
          </p>
          <Link href="/loja" className="btn btn-primary mt-8">Explorar a loja <ArrowRight size={16} /></Link>
        </Reveal>
      </section>
    </>
  );
}
