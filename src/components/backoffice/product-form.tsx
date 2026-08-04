"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { upsertProductAction, type ProductInput } from "@/app/actions/backoffice-catalog";
import { useToast } from "@/components/ui/toast";
import {
  BRANDS, GENDERS, GENDER_LABELS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZES, SIZE_LABELS,
} from "@/lib/enums";

type VariantRow = {
  id?: string; size: string; color: string; colorHex: string;
  stock: string; cost: string; priceOverride: string;
};

export type ProductFormInitial = {
  id?: string;
  brand: string; name: string; modelName: string; type: string; gender: string;
  description: string; details: string; basePrice: string; compareAtPrice: string;
  collectionId: string; featured: boolean; active: boolean; images: string;
  variants: VariantRow[];
};

const emptyVariant = (): VariantRow => ({ size: "M", color: "", colorHex: "#22262E", stock: "0", cost: "", priceOverride: "" });

export function ProductForm({
  initial,
  collections,
}: {
  initial?: ProductFormInitial;
  collections: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState<ProductFormInitial>(
    initial ?? {
      brand: "HUX", name: "", modelName: "", type: "CAMISA", gender: "UNISSEX",
      description: "", details: "", basePrice: "", compareAtPrice: "",
      collectionId: "", featured: false, active: true, images: "",
      variants: [emptyVariant()],
    },
  );

  const set = <K extends keyof ProductFormInitial>(k: K, v: ProductFormInitial[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const setVariant = (i: number, k: keyof VariantRow, v: string) =>
    setF((p) => ({ ...p, variants: p.variants.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)) }));

  const addVariant = () => setF((p) => ({ ...p, variants: [...p.variants, emptyVariant()] }));
  const removeVariant = (i: number) =>
    setF((p) => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }));

  async function submit() {
    if (!f.name.trim()) return toast("Informe o nome do produto.", "error");
    if (!f.basePrice.trim()) return toast("Informe o preço.", "error");
    if (f.variants.length === 0) return toast("Adicione ao menos uma variante.", "error");

    setSaving(true);
    const input: ProductInput = {
      id: f.id,
      brand: f.brand as ProductInput["brand"],
      name: f.name,
      modelName: f.modelName || undefined,
      type: f.type as ProductInput["type"],
      gender: f.gender as ProductInput["gender"],
      description: f.description || undefined,
      details: f.details || undefined,
      basePrice: f.basePrice,
      compareAtPrice: f.compareAtPrice || undefined,
      collectionId: f.collectionId || undefined,
      images: f.images.split(/\n/).map((s) => s.trim()).filter(Boolean),
      featured: f.featured,
      active: f.active,
      variants: f.variants.map((v) => ({
        id: v.id,
        size: v.size as never,
        color: v.color,
        colorHex: v.colorHex,
        stock: Number(v.stock) || 0,
        cost: v.cost || undefined,
        priceOverride: v.priceOverride || undefined,
      })),
    };
    const res = await upsertProductAction(input);
    setSaving(false);
    if (res.ok) {
      toast(f.id ? "Produto atualizado." : "Produto criado.", "success");
      router.push("/backoffice/produtos");
      router.refresh();
    } else {
      toast(res.error ?? "Erro ao salvar.", "error");
    }
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="card space-y-4 p-6">
        <h2 className="headline text-lg">Informações</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Nome *</span>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Camisa Ultramaratonista" />
          </label>
          <label><span className={label}>Modelo / coleção da peça</span>
            <input className="field" value={f.modelName} onChange={(e) => set("modelName", e.target.value)} placeholder="Ultramaratonista" />
          </label>
          <label><span className={label}>Marca *</span>
            <select className="field" value={f.brand} onChange={(e) => set("brand", e.target.value)}>
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label><span className={label}>Tipo *</span>
            <select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label><span className={label}>Gênero *</span>
            <select className="field" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
            </select>
          </label>
          <label><span className={label}>Coleção</span>
            <select className="field" value={f.collectionId} onChange={(e) => set("collectionId", e.target.value)}>
              <option value="">— Nenhuma —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block"><span className={label}>Descrição</span>
          <textarea className="field min-h-20" value={f.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="block"><span className={label}>Especificações (separe por · )</span>
          <textarea className="field min-h-16" value={f.details} onChange={(e) => set("details", e.target.value)} placeholder="Dry Fit furado · Secagem rápida · Refletivos" />
        </label>
      </div>

      {/* Pricing */}
      <div className="card space-y-4 p-6">
        <h2 className="headline text-lg">Preço</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Preço de venda (R$) *</span>
            <input className="field" value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} placeholder="219,90" inputMode="decimal" />
          </label>
          <label><span className={label}>Preço "de" (R$) — riscado</span>
            <input className="field" value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="259,90" inputMode="decimal" />
          </label>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-orange" />
            Destaque na home
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" />
            Ativo (visível na loja)
          </label>
        </div>
      </div>

      {/* Images */}
      <div className="card space-y-3 p-6">
        <h2 className="headline text-lg">Imagens</h2>
        <p className="text-sm text-muted">
          Uma URL por linha. {!f.id && "Se deixar em branco, geramos uma arte de catálogo automaticamente."}
        </p>
        <textarea className="field min-h-20 font-mono text-xs" value={f.images} onChange={(e) => set("images", e.target.value)} placeholder="/products/exemplo-1.svg" />
      </div>

      {/* Variants */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-lg">Variantes (cor / tamanho)</h2>
          <button onClick={addVariant} className="btn btn-ghost px-3 py-2 text-xs"><Plus size={14} /> Adicionar</button>
        </div>
        <div className="space-y-3">
          {f.variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-[var(--radius)] border border-line p-3 sm:grid-cols-[80px_1fr_60px_1fr_1fr_1fr_auto]">
              <label><span className="data-label text-faint">Tam.</span>
                <select className="field mt-1 py-2" value={v.size} onChange={(e) => setVariant(i, "size", e.target.value)}>
                  {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                </select>
              </label>
              <label><span className="data-label text-faint">Cor</span>
                <input className="field mt-1 py-2" value={v.color} onChange={(e) => setVariant(i, "color", e.target.value)} placeholder="Preto" />
              </label>
              <label><span className="data-label text-faint">Hex</span>
                <input type="color" className="mt-1 h-9 w-full cursor-pointer rounded border border-line bg-void" value={v.colorHex} onChange={(e) => setVariant(i, "colorHex", e.target.value)} />
              </label>
              <label><span className="data-label text-faint">Estoque</span>
                <input className="field mt-1 py-2" value={v.stock} onChange={(e) => setVariant(i, "stock", e.target.value)} inputMode="numeric" />
              </label>
              <label><span className="data-label text-faint">Custo R$</span>
                <input className="field mt-1 py-2" value={v.cost} onChange={(e) => setVariant(i, "cost", e.target.value)} placeholder="0,00" inputMode="decimal" />
              </label>
              <label><span className="data-label text-faint">Preço próprio</span>
                <input className="field mt-1 py-2" value={v.priceOverride} onChange={(e) => setVariant(i, "priceOverride", e.target.value)} placeholder="opcional" inputMode="decimal" />
              </label>
              <button onClick={() => removeVariant(i)} className="mt-5 grid size-9 place-items-center self-start text-faint hover:text-negative" aria-label="Remover variante">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost">Cancelar</button>
        <button onClick={submit} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {f.id ? "Salvar alterações" : "Criar produto"}
        </button>
      </div>
    </div>
  );
}
