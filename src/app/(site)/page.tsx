import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Wind, Timer, ShieldCheck, Recycle } from "lucide-react";
import { getFeaturedProducts, getNewArrivals, getCollectionsWithCover } from "@/lib/catalog";
import { BRANDS, BRAND_INFO } from "@/lib/enums";
import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/site/section-heading";
import { Marquee } from "@/components/site/marquee";
import { Reveal } from "@/components/ui/reveal";

export default async function HomePage() {
  const [featuredRaw, newArrivals, collections] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(12),
    getCollectionsWithCover(),
  ]);
  // Fill the drop grid to a clean multiple of the column count (4 desktop / 2 mobile)
  // by topping up featured products with the latest arrivals (no duplicates).
  const merged = [...featuredRaw];
  for (const p of newArrivals) {
    if (merged.length >= 8) break;
    if (!merged.some((m) => m.id === p.id)) merged.push(p);
  }
  const target = merged.length >= 8 ? 8 : merged.length >= 4 ? 4 : merged.length;
  const featured = merged.slice(0, target);

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative grain overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-60" />
        <div className="glow-orange absolute -right-40 -top-40 h-[520px] w-[520px]" />
        <div className="glow-orange absolute -bottom-52 left-1/4 h-[420px] w-[420px] opacity-60" />

        <div className="container-hux relative z-[2] flex min-h-[calc(100vh-72px)] flex-col justify-center py-20">
          <p
            className="eyebrow mb-6 flex items-center gap-3 animate-rise"
            style={{ animationDelay: "60ms" }}
          >
            <span className="inline-block h-px w-10 bg-orange" />
            EST. 2026 — SÃO PAULO · BRASIL
          </p>

          <h1 className="display-hero animate-rise" style={{ animationDelay: "140ms" }}>
            Built to
            <br />
            <span className="text-stroke-orange">move</span>
          </h1>

          <p
            className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft animate-rise"
            style={{ animationDelay: "260ms" }}
          >
            Vestuário técnico de corrida desenhado para a distância, a velocidade e a rua.
            Quatro marcas, uma obsessão: performance que você veste todos os dias.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-4 animate-rise"
            style={{ animationDelay: "380ms" }}
          >
            <Link href="/loja" className="btn btn-primary">
              Comprar agora <ArrowRight size={16} />
            </Link>
            <Link href="/colecoes" className="btn btn-ghost">
              Ver coleções
            </Link>
          </div>

          {/* stat strip */}
          <div
            className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-line pt-8 animate-rise"
            style={{ animationDelay: "500ms" }}
          >
            {[
              { n: "4", l: "Marcas técnicas" },
              { n: "19+", l: "Produtos no drop" },
              { n: "48h", l: "Envio expresso" },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-4xl text-orange sm:text-5xl">{s.n}</p>
                <p className="data-label mt-1 text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* scroll cue */}
        <div className="container-hux relative z-[2] hidden pb-6 md:block">
          <div className="flex items-center gap-3 text-faint">
            <span className="data-label">Role</span>
            <span className="h-8 w-px animate-pulse bg-line" />
          </div>
        </div>
      </section>

      {/* ============================ TICKER ============================ */}
      <Marquee
        items={["RUN", "PERFORMANCE", "LIFESTYLE", "DRY-FIT", "REFLETIVO", "FEITO NO BRASIL"]}
        className="border-b border-line bg-orange py-3.5 font-display text-xl uppercase text-void"
        fast
      />

      {/* ============================ FEATURED ============================ */}
      <section className="container-hux py-20 md:py-28">
        <Reveal>
          <SectionHeading eyebrow="Novidades" title="No drop agora" link="/loja" />
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProductCard product={p} priority={i < 4} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ BRANDS ============================ */}
      <section className="border-y border-line bg-void">
        <div className="container-hux py-20 md:py-28">
          <Reveal>
            <SectionHeading
              eyebrow="Casa de marcas"
              title={<>Quatro DNAs.<br />Uma linha de partida.</>}
            />
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {BRANDS.map((brand, i) => {
              const info = BRAND_INFO[brand];
              return (
                <Reveal key={brand} delay={i * 80}>
                  <Link
                    href={`/loja?marca=${brand}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-line bg-graphite p-8 transition-colors hover:border-[color:var(--accent)] md:min-h-[280px]"
                    style={{ ["--accent" as string]: info.accent }}
                  >
                    <div
                      className="glow-orange absolute -right-20 -top-20 h-56 w-56 opacity-0 transition-opacity duration-500 group-hover:opacity-70"
                      style={{ background: `radial-gradient(circle, ${info.accent}55, transparent 68%)` }}
                    />
                    <div className="relative z-[1] flex items-start justify-between">
                      <span
                        className="font-display text-5xl uppercase md:text-6xl"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {brand}
                      </span>
                      <ArrowUpRight
                        size={28}
                        className="text-faint transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                        style={{ color: info.accent }}
                      />
                    </div>
                    <div className="relative z-[1] mt-8">
                      <span
                        className="chip mb-3"
                        style={{ borderColor: `${info.accent}66`, color: info.accent }}
                      >
                        {info.tagline}
                      </span>
                      <p className="max-w-md text-sm leading-relaxed text-muted">{info.blurb}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================ COLLECTIONS ============================ */}
      {collections.length > 0 && (
        <section className="container-hux py-20 md:py-28">
          <Reveal>
            <SectionHeading eyebrow="Curadoria" title="Coleções" link="/colecoes" />
          </Reveal>
          <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible">
            {collections.map((c, i) => (
              <Reveal key={c.slug} delay={i * 60} className="w-[78vw] shrink-0 snap-start sm:w-[45vw] md:w-auto">
                <Link href={`/colecoes/${c.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-void">
                    {c.cover && (
                      <Image
                        src={c.cover}
                        alt={c.name}
                        fill
                        sizes="(max-width:768px) 78vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="data-label text-orange">{c.count} peças</p>
                      <h3 className="headline mt-1 text-2xl">{c.name}</h3>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ============================ TECHNOLOGY ============================ */}
      <section className="relative overflow-hidden border-y border-line bg-void">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="container-hux relative z-[1] grid gap-14 py-20 md:grid-cols-2 md:py-28">
          <Reveal>
            <p className="eyebrow mb-4 flex items-center gap-2">
              <span className="inline-block h-px w-8 bg-orange" />
              Engenharia HUX
            </p>
            <h2 className="headline text-4xl sm:text-5xl md:text-6xl">
              Cada costura
              <br />
              tem um <span className="text-orange">porquê.</span>
            </h2>
            <p className="mt-6 max-w-md text-ink-soft">
              Testamos cada peça na rua, não no laboratório. Tecidos que respiram, costuras que
              não marcam e refletivos que te mantêm visível quando o sol vai embora.
            </p>
            <Link href="/tecnologia" className="btn btn-ghost mt-8">
              Nossa tecnologia <ArrowRight size={16} />
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Wind, t: "Dry-Fit furado", d: "Ventilação estratégica que seca no vento." },
              { icon: Timer, t: "Race-fit", d: "Gramatura mínima, aerodinâmica máxima." },
              { icon: ShieldCheck, t: "Refletivos 360°", d: "Visível em qualquer direção à noite." },
              { icon: Recycle, t: "Anti-odor", d: "Tratamento que aguenta o treino inteiro." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 80}>
                <div className="card h-full p-6">
                  <f.icon size={26} className="text-orange" />
                  <h3 className="mt-5 font-semibold uppercase tracking-wide">{f.t}</h3>
                  <p className="mt-2 text-sm text-muted">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ MANIFESTO CTA ============================ */}
      <section className="container-hux py-24 text-center md:py-36">
        <Reveal>
          <p className="eyebrow mb-6">O quilômetro não mente</p>
          <p className="mx-auto max-w-4xl font-display text-4xl uppercase leading-[0.95] sm:text-6xl md:text-7xl">
            Não vendemos roupa.
            <br />
            Vestimos quem <span className="text-orange">não para.</span>
          </p>
          <Link href="/loja" className="btn btn-primary mt-12">
            Encontre o seu kit <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
