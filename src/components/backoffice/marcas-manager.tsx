"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2, Tag, Layers } from "lucide-react";
import { Modal } from "./modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  upsertBrandAction, deleteBrandAction, upsertCollectionAction, deleteCollectionAction,
} from "@/app/actions/backoffice-brands";

export type BrandRow = { id: string; name: string; tagline: string; blurb: string; accent: string; active: boolean; sortOrder: number; productCount: number };
export type CollectionRow = { id: string; name: string; description: string; active: boolean; sortOrder: number; productCount: number };

const label = "data-label mb-1.5 block text-muted";

export function MarcasManager({ brands, collections }: { brands: BrandRow[]; collections: CollectionRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  // ---- brand modal state ----
  const [bOpen, setBOpen] = useState(false);
  const [bBusy, setBBusy] = useState(false);
  const [b, setB] = useState<BrandRow>({ id: "", name: "", tagline: "", blurb: "", accent: "#C6FF00", active: true, sortOrder: 0, productCount: 0 });

  function newBrand() { setB({ id: "", name: "", tagline: "", blurb: "", accent: "#C6FF00", active: true, sortOrder: brands.length + 1, productCount: 0 }); setBOpen(true); }
  function editBrand(row: BrandRow) { setB({ ...row, accent: row.accent || "#C6FF00" }); setBOpen(true); }

  async function saveBrand() {
    if (!b.name.trim()) return toast("Informe o nome da marca.", "error");
    setBBusy(true);
    const res = await upsertBrandAction({ id: b.id || undefined, name: b.name, tagline: b.tagline, blurb: b.blurb, accent: b.accent, active: b.active, sortOrder: b.sortOrder });
    setBBusy(false);
    if (res.ok) { toast("Marca salva.", "success"); setBOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function removeBrand(row: BrandRow) {
    if (!confirm(`Excluir a marca ${row.name}?`)) return;
    const res = await deleteBrandAction(row.id);
    if (res.ok) { toast("Marca excluída.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  // ---- collection modal state ----
  const [cOpen, setCOpen] = useState(false);
  const [cBusy, setCBusy] = useState(false);
  const [c, setC] = useState<CollectionRow>({ id: "", name: "", description: "", active: true, sortOrder: 0, productCount: 0 });

  function newCollection() { setC({ id: "", name: "", description: "", active: true, sortOrder: collections.length + 1, productCount: 0 }); setCOpen(true); }
  function editCollection(row: CollectionRow) { setC({ ...row }); setCOpen(true); }

  async function saveCollection() {
    if (!c.name.trim()) return toast("Informe o nome da coleção.", "error");
    setCBusy(true);
    const res = await upsertCollectionAction({ id: c.id || undefined, name: c.name, description: c.description, active: c.active, sortOrder: c.sortOrder });
    setCBusy(false);
    if (res.ok) { toast("Coleção salva.", "success"); setCOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function removeCollection(row: CollectionRow) {
    if (!confirm(`Excluir a coleção "${row.name}"? Os produtos ficam sem coleção.`)) return;
    const res = await deleteCollectionAction(row.id);
    if (res.ok) { toast("Coleção excluída.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Brands */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="eyebrow flex items-center gap-2"><Tag size={14} /> Marcas ({brands.length})</p>
          <button onClick={newBrand} className="btn btn-primary px-3 py-1.5 text-xs"><Plus size={14} /> Nova marca</button>
        </div>
        <div className="divide-y divide-line">
          {brands.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhuma marca cadastrada.</p>}
          {brands.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-5 py-3">
              <span className="size-4 shrink-0 rounded-full border border-line" style={{ background: row.accent || "#888" }} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">{row.name}{!row.active && <span className="rounded bg-negative/10 px-1.5 py-0.5 text-[0.6rem] uppercase text-negative">inativa</span>}</p>
                <p className="truncate text-xs text-muted">{row.tagline || "—"} · {row.productCount} produto(s)</p>
              </div>
              <button onClick={() => editBrand(row)} className="text-faint hover:text-orange" aria-label="Editar"><Pencil size={15} /></button>
              <button onClick={() => removeBrand(row)} className="text-faint hover:text-negative" aria-label="Excluir"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Collections */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="eyebrow flex items-center gap-2"><Layers size={14} /> Coleções ({collections.length})</p>
          <button onClick={newCollection} className="btn btn-primary px-3 py-1.5 text-xs"><Plus size={14} /> Nova coleção</button>
        </div>
        <div className="divide-y divide-line">
          {collections.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhuma coleção cadastrada.</p>}
          {collections.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">{row.name}{!row.active && <span className="rounded bg-negative/10 px-1.5 py-0.5 text-[0.6rem] uppercase text-negative">inativa</span>}</p>
                <p className="truncate text-xs text-muted">{row.description || "—"} · {row.productCount} produto(s)</p>
              </div>
              <button onClick={() => editCollection(row)} className="text-faint hover:text-orange" aria-label="Editar"><Pencil size={15} /></button>
              <button onClick={() => removeCollection(row)} className="text-faint hover:text-negative" aria-label="Excluir"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Brand modal */}
      <Modal open={bOpen} onClose={() => setBOpen(false)} title={b.id ? "Editar marca" : "Nova marca"}>
        <div className="space-y-4">
          <label className="block"><span className={label}>Nome *</span>
            <input className="field uppercase" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="Ex.: HUX" />
          </label>
          <label className="block"><span className={label}>Slogan curto</span>
            <input className="field" value={b.tagline} onChange={(e) => setB({ ...b, tagline: e.target.value })} placeholder="Ex.: Velocidade" />
          </label>
          <label className="block"><span className={label}>Descrição (site)</span>
            <textarea className="field min-h-16" value={b.blurb} onChange={(e) => setB({ ...b, blurb: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className={label}>Cor de destaque</span>
              <input type="color" className="h-10 w-full cursor-pointer rounded border border-line bg-void" value={b.accent} onChange={(e) => setB({ ...b, accent: e.target.value })} />
            </label>
            <label className="block"><span className={label}>Ordem</span>
              <input className="field" value={String(b.sortOrder)} onChange={(e) => setB({ ...b, sortOrder: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={b.active} onChange={(e) => setB({ ...b, active: e.target.checked })} className="size-4 accent-orange" /> Ativa (aparece na loja)
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setBOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={saveBrand} disabled={bBusy} className={cn("btn btn-primary")}>{bBusy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>

      {/* Collection modal */}
      <Modal open={cOpen} onClose={() => setCOpen(false)} title={c.id ? "Editar coleção" : "Nova coleção"}>
        <div className="space-y-4">
          <label className="block"><span className={label}>Nome *</span>
            <input className="field" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Ex.: Verão 2026" />
          </label>
          <label className="block"><span className={label}>Descrição</span>
            <textarea className="field min-h-16" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
          </label>
          <label className="block max-w-[140px]"><span className={label}>Ordem</span>
            <input className="field" value={String(c.sortOrder)} onChange={(e) => setC({ ...c, sortOrder: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} className="size-4 accent-orange" /> Ativa (aparece na loja)
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setCOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={saveCollection} disabled={cBusy} className="btn btn-primary">{cBusy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
