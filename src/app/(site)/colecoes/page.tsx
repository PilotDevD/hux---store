import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCollectionsWithCover } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Coleções",
  description: "Coleções HUX — curadoria por estação, terreno e propósito.",
};

export default async function CollectionsPage() {
  const collections = await getCollectionsWithCover();

  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="tech-grid absolute inset-0 opacity-40" />
        <div className="glow-orange absolute -left-32 -top-24 h-80 w-80 opacity-70" />
        <div className="container-hux relative z-[1] py-14 md:py-20">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-orange" />
            Curadoria
          </p>
          <h1 className="display-hero text-6xl sm:text-7xl md:text-8xl">Coleções</h1>
        </div>
      </header>

      <div className="container-hux grid gap-6 py-12 md:grid-cols-2">
        {collections.map((c) => (
          <Link key={c.slug} href={`/colecoes/${c.slug}`} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-void">
              {c.cover && (
                <Image
                  src={c.cover}
                  alt={c.name}
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <p className="data-label text-orange">{c.count} peças</p>
                <h2 className="headline mt-1 text-3xl md:text-4xl">{c.name}</h2>
                {c.description && (
                  <p className="mt-2 max-w-md text-sm text-ink-soft">{c.description}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
