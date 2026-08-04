import type { Metadata } from "next";
import { Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a HUX. Dúvidas sobre pedidos, trocas, parcerias e imprensa.",
};

const INFO = [
  { icon: Mail, label: "E-mail", value: "contato@hux.com.br", href: "mailto:contato@hux.com.br" },
  { icon: MessageCircle, label: "WhatsApp", value: "(11) 98765-4321", href: "https://wa.me/5511987654321" },
  { icon: MapPin, label: "Base", value: "São Paulo · SP", href: undefined },
  { icon: Clock, label: "Atendimento", value: "Seg a Sex · 9h às 18h", href: undefined },
];

export default function ContatoPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="glow-orange absolute -left-20 top-0 h-80 w-80 opacity-60" />
        <div className="container-hux relative z-[1] py-16 md:py-20">
          <p className="eyebrow mb-3 flex items-center gap-2"><span className="inline-block h-px w-8 bg-orange" /> Fale com a gente</p>
          <h1 className="display-hero text-6xl sm:text-7xl">Contato</h1>
        </div>
      </section>

      <div className="container-hux grid gap-10 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="headline text-2xl">Canais</h2>
          <p className="mt-2 text-muted">Respondemos rápido. Escolha o que preferir.</p>
          <div className="mt-8 space-y-3">
            {INFO.map((it) => {
              const content = (
                <div className="card flex items-center gap-4 p-5 transition-colors hover:border-orange/40">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full border border-line">
                    <it.icon size={19} className="text-orange" />
                  </div>
                  <div>
                    <p className="data-label text-muted">{it.label}</p>
                    <p className="font-semibold">{it.value}</p>
                  </div>
                </div>
              );
              return it.href ? (
                <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
              ) : (
                <div key={it.label}>{content}</div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="headline text-2xl">Envie uma mensagem</h2>
          <p className="mt-2 text-muted">Preencha e retornamos por e-mail.</p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}
