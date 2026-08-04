import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wind, Droplets, Sun, Zap, Shirt, Ruler } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { Marquee } from "@/components/site/marquee";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Tecnologia",
  description: "Os tecidos e tecnologias por trás das peças HUX: Dry-Fit furado, Suplex Maxxi, refletivos e mais.",
};

const FABRICS = [
  { name: "Dry-Fit furado", use: "Camisas e regatas de treino", spec: "Micro-perfurações que aceleram a evaporação do suor. Seco em minutos." },
  { name: "Fluid", use: "Peças de prova", spec: "Ultraleve (a partir de 89g). Aerodinâmico, quase não se sente no corpo." },
  { name: "Suplex Maxxi", use: "Tops e leggings", spec: "Compressão que sustenta sem apertar. Não fica transparente no agachamento." },
  { name: "Malha PV premium", use: "Moletons", spec: "Felpa densa para o pós-treino. Toque seco por fora, aconchego por dentro." },
];

const TECH = [
  { icon: Wind, t: "Ventilação por zona", d: "Painéis de respiro nas costas, axilas e laterais onde o corpo esquenta mais." },
  { icon: Droplets, t: "Gestão de umidade", d: "Fios que puxam o suor para a superfície e secam no vento." },
  { icon: Sun, t: "Proteção UV50+", d: "Peças de trilha e verão bloqueiam a radiação nos dias longos de sol." },
  { icon: Zap, t: "Costura flatlock", d: "Costuras planas que eliminam o atrito e o assadura em treinos longos." },
  { icon: Shirt, t: "Anti-odor", d: "Tratamento que inibe as bactérias do suor. Aguenta o treino inteiro." },
  { icon: Ruler, t: "Refletivos 360°", d: "Detalhes que refletem faróis de qualquer ângulo. Visível quando o sol vai embora." },
];

export default function TecnologiaPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-void">
        <div className="tech-grid absolute inset-0 opacity-50" />
        <div className="glow-orange absolute left-1/4 top-0 h-96 w-96 opacity-50" />
        <div className="container-hux relative z-[1] py-20 md:py-28">
          <p className="eyebrow mb-4 flex items-center gap-2"><span className="inline-block h-px w-8 bg-orange" /> Engenharia HUX</p>
          <h1 className="display-hero text-6xl sm:text-7xl md:text-8xl">
            Cada fio
            <br />
            tem <span className="text-orange">função.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Não usamos tecido bonito. Usamos o tecido certo. Aqui está o que faz uma peça HUX se comportar
            diferente no quilômetro 15.
          </p>
        </div>
      </section>

      {/* Tech grid */}
      <section className="container-hux py-16 md:py-24">
        <Reveal><SectionHeading eyebrow="Tecnologias" title="O que está por dentro" /></Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TECH.map((t, i) => (
            <Reveal key={t.t} delay={i * 60}>
              <div className="card group h-full p-6 transition-colors hover:border-orange/40">
                <div className="grid size-12 place-items-center rounded-[var(--radius)] border border-line bg-void transition-colors group-hover:border-orange/40">
                  <t.icon size={22} className="text-orange" />
                </div>
                <h3 className="mt-5 font-semibold uppercase tracking-wide">{t.t}</h3>
                <p className="mt-2 text-sm text-muted">{t.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Marquee items={["DRY-FIT", "SUPLEX MAXXI", "FLUID", "UV50+", "ANTI-ODOR", "REFLETIVO 360°"]} className="border-y border-line bg-orange py-3.5 font-display text-xl uppercase text-void" fast />

      {/* Fabrics */}
      <section className="container-hux py-16 md:py-24">
        <Reveal><SectionHeading eyebrow="Materiais" title="Nossos tecidos" /></Reveal>
        <div className="mt-12 overflow-hidden rounded-[var(--radius-lg)] border border-line">
          {FABRICS.map((f, i) => (
            <Reveal key={f.name} delay={i * 60}>
              <div className="grid gap-2 border-b border-line p-6 last:border-0 md:grid-cols-[1fr_1fr_2fr] md:items-center md:gap-8 md:p-8">
                <span className="font-display text-2xl md:text-3xl">{f.name}</span>
                <span className="data-label text-orange">{f.use}</span>
                <p className="text-sm text-muted">{f.spec}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-hux pb-24 text-center">
        <Reveal>
          <p className="eyebrow mb-6">Sinta a diferença</p>
          <p className="mx-auto max-w-3xl font-display text-4xl uppercase leading-[0.95] sm:text-5xl md:text-6xl">
            A engenharia você <span className="text-orange">veste.</span>
          </p>
          <Link href="/loja" className="btn btn-primary mt-8">Ver os produtos <ArrowRight size={16} /></Link>
        </Reveal>
      </section>
    </>
  );
}
