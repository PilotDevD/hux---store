"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save, UploadCloud, Star, X, Link2, AlertTriangle } from "lucide-react";
import {
  upsertProductAction, uploadImageAction, hardDeleteProductAction, type ProductInput,
} from "@/app/actions/backoffice-catalog";
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
  supplierCode: string;
  description: string; details: string; basePrice: string; compareAtPrice: string;
  collectionId: string; featured: boolean; active: boolean; images: string;
  variants: VariantRow[];
};

const emptyVariant = (): VariantRow => ({ size: "M", color: "", colorHex: "#22262E", stock: "0", cost: "", priceOverride: "" });

/** Downscale a picked image in-browser so we store a light JPEG (keeps the DB small). */
async function shrinkImage(file: File, maxDim = 1400, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob failed"))), "image/jpeg", quality),
  );
}

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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<ProductFormInitial>(
    initial ?? {
      brand: "HUX", name: "", modelName: "", type: "CAMISA", gender: "UNISSEX",
      supplierCode: "",
      description: "", details: "", basePrice: "", compareAtPrice: "",
      collectionId: "", featured: false, active: true, images: "",
      variants: [emptyVariant()],
    },
  );

  const set = <K extends keyof ProductFormInitial>(k: K, v: ProductFormInitial[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  // Images are kept as a newline-joined string (matches the server action shape).
  const imgList = f.images.split("\n").map((s) => s.trim()).filter(Boolean);
  const setImgList = (arr: string[]) => set("images", arr.join("\n"));

  const setVariant = (i: number, k: keyof VariantRow, v: string) =>
    setF((p) => ({ ...p, variants: p.variants.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)) }));

  const addVariant = () => setF((p) => ({ ...p, variants: [...p.variants, emptyVariant()] }));
  const removeVariant = (i: number) =>
    setF((p) => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }));

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((x) => x.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of list) {
      try {
        let blob: Blob = file;
        try { blob = await shrinkImage(file); } catch { /* keep original if canvas fails */ }
        const fd = new FormData();
        const base = file.name.replace(/\.[^.]+$/, "") || "foto";
        fd.append("file", blob, `${base}.jpg`);
        const res = await uploadImageAction(fd);
        if (res.ok && res.url) added.push(res.url);
        else toast(res.error ?? "Falha ao enviar imagem.", "error");
      } catch {
        toast("Falha ao processar a imagem.", "error");
      }
    }
    if (added.length) setImgList([...imgList, ...added]);
    setUploading(false);
  }

  const makeCover = (i: number) => setImgList([imgList[i], ...imgList.filter((_, idx) => idx !== i)]);
  const removeImg = (i: number) => setImgList(imgList.filter((_, idx) => idx !== i));
  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    setImgList([...imgList, u]);
    setUrlInput("");
  };

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
      supplierCode: f.supplierCode || undefined,
      description: f.description || undefined,
      details: f.details || undefined,
      basePrice: f.basePrice,
      compareAtPrice: f.compareAtPrice || undefined,
      collectionId: f.collectionId || undefined,
      images: imgList,
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

  async function doHardDelete() {
    if (!f.id) return;
    setDeleting(true);
    const res = await hardDeleteProductAction(f.id);
    setDeleting(false);
    if (res.ok) {
      toast("Produto excluído definitivamente.", "success");
      router.push("/backoffice/produtos");
      router.refresh();
    } else {
      toast(res.error ?? "Erro ao excluir.", "error");
      setConfirmDelete(false);
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
          <label><span className={label}>Código do fornecedor</span>
            <input className="field" value={f.supplierCode} onChange={(e) => set("supplierCode", e.target.value)} placeholder="Ex.: FORN-3345 / ref. da compra" />
          </label>
          <label className="sm:col-span-2"><span className={label}>Coleção</span>
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
          <label><span className={label}>Preço &quot;de&quot; (R$) — riscado</span>
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
      <div className="card space-y-4 p-6">
        <h2 className="headline text-lg">Fotos do produto</h2>

        {/* Dropzone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-orange bg-orange/5" : "border-line hover:border-ink-soft"}`}
        >
          {uploading ? <Loader2 size={26} className="animate-spin text-orange" /> : <UploadCloud size={26} className="text-faint" />}
          <p className="text-sm font-medium">{uploading ? "Enviando…" : "Arraste fotos aqui ou clique para escolher"}</p>
          <p className="text-xs text-faint">JPG, PNG ou WEBP · até 5 MB cada · a 1ª foto é a capa</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* Thumbnails */}
        {imgList.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {imgList.map((src, i) => (
              <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-[var(--radius)] border border-line bg-void">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-orange px-1.5 py-0.5 text-[10px] font-bold text-void">
                    <Star size={10} /> Capa
                  </span>
                )}
                <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 ? (
                    <button type="button" onClick={() => makeCover(i)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-void hover:bg-white" title="Tornar capa">
                      Capa
                    </button>
                  ) : <span />}
                  <button type="button" onClick={() => removeImg(i)} className="grid size-6 place-items-center rounded bg-negative/90 text-white hover:bg-negative" title="Remover">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Advanced: add by URL */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="field py-2 pl-9 font-mono text-xs"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
              placeholder="…ou cole uma URL de imagem"
            />
          </div>
          <button type="button" onClick={addUrl} className="btn btn-ghost px-3 py-2 text-xs">Adicionar</button>
        </div>
        {!f.id && imgList.length === 0 && (
          <p className="text-xs text-faint">Se não enviar nenhuma foto, geramos uma arte de catálogo automaticamente.</p>
        )}
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

      {/* Danger zone — edit only */}
      {f.id && (
        <div className="card border-negative/30 p-6">
          <div className="flex items-center gap-2 text-negative">
            <AlertTriangle size={18} />
            <h2 className="headline text-lg">Zona de perigo</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            A exclusão definitiva remove o produto e todas as variantes do banco de dados. O histórico de pedidos é
            preservado (cada item guarda seu próprio registro). Esta ação não pode ser desfeita.
          </p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="btn btn-ghost mt-4 border-negative/40 text-negative hover:bg-negative/10">
              <Trash2 size={16} /> Excluir produto definitivamente
            </button>
          ) : (
            <div className="mt-4 space-y-3 rounded-[var(--radius)] border border-negative/40 bg-negative/5 p-4">
              <p className="text-sm font-medium text-negative">Tem certeza? Isso apaga o produto de vez.</p>
              <div className="flex gap-2">
                <button onClick={doHardDelete} disabled={deleting} className="btn btn-ghost border-negative/50 bg-negative/10 text-negative hover:bg-negative/20">
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Sim, excluir agora
                </button>
                <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
