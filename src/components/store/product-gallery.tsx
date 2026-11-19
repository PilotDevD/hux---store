"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useProductColor } from "./product-color-context";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const { leadImage } = useProductColor();
  const [active, setActive] = useState(0);

  // Quando uma cor com foto própria é selecionada, essa foto entra na galeria
  // (no início, se ainda não existir) e vira a imagem principal.
  const list = useMemo(() => {
    const base = images.length ? images : [];
    if (leadImage && !base.includes(leadImage)) return [leadImage, ...base];
    return base;
  }, [images, leadImage]);

  useEffect(() => {
    if (!leadImage) return;
    const idx = list.indexOf(leadImage);
    if (idx >= 0) setActive(idx);
  }, [leadImage, list]);

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <div className="flex gap-3 md:flex-col">
          {list.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 overflow-hidden rounded-[var(--radius)] border transition-colors md:size-20",
                i === active ? "border-orange" : "border-line hover:border-ink-soft",
              )}
              aria-label={`Imagem ${i + 1}`}
            >
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-void">
        {list[active] ? (
          <Image
            src={list[active]}
            alt={alt}
            fill
            priority
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center font-display text-4xl text-faint">HUX</div>
        )}
      </div>
    </div>
  );
}
