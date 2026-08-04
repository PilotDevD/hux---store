import { Marquee } from "@/components/site/marquee";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line bg-void lg:block">
        <div className="tech-grid absolute inset-0 opacity-50" />
        <div className="glow-orange absolute -left-20 top-1/3 h-96 w-96" />
        <div className="relative z-[1] flex h-full flex-col justify-between p-12">
          <p className="eyebrow">Área do corredor</p>
          <div>
            <p className="display-hero text-6xl xl:text-7xl">
              Todo km
              <br />
              <span className="text-orange">conta.</span>
            </p>
            <p className="mt-6 max-w-sm text-ink-soft">
              Acompanhe pedidos, salve endereços e receba notificações dos seus drops favoritos.
            </p>
          </div>
          <Marquee
            items={["RUN", "PERFORMANCE", "LIFESTYLE"]}
            className="font-display text-2xl uppercase text-line"
          />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="headline text-3xl md:text-4xl">{title}</h1>
          <p className="mb-8 mt-2 text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
