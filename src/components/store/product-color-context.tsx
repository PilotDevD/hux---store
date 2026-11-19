"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = {
  /** Foto principal pedida pela cor selecionada (null = usa a galeria padrão). */
  leadImage: string | null;
  setLeadImage: (src: string | null) => void;
};

const ProductColorCtx = createContext<Ctx | null>(null);

export function ProductColorProvider({ children }: { children: ReactNode }) {
  const [leadImage, setLeadImage] = useState<string | null>(null);
  return (
    <ProductColorCtx.Provider value={{ leadImage, setLeadImage }}>
      {children}
    </ProductColorCtx.Provider>
  );
}

/** Safe no-op quando usado fora do provider (ex.: galeria em outra página). */
export function useProductColor(): Ctx {
  return useContext(ProductColorCtx) ?? { leadImage: null, setLeadImage: () => {} };
}
