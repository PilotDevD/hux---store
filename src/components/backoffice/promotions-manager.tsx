"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Percent } from "lucide-react";
import { upsertPromotionAction, deletePromotionAction } from "@/app/actions/backoffice-catalog";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { BRANDS, PROMOTION_SCOPES } from "@/lib/enums";

export type PromoRow = {
  id: string; name: string; type: string; value: number; scope: string;
  targetBrand: string | null; collectionId: string | null; active: boolean;
  startsAt: string | null; endsAt: string | null; productIds: string[];
};

type FormState = {
  id?: string; name: string; type: string; value: string; scope: string;
  targetBrand: string; collectionId: string; productIds: string[];
  startsAt: string; endsAt: string; active: boolean;
};

const empty: FormState = {
  name: "", type: "PERCENT", value: "", scope: "ALL", targetBrand: "HUX",
  collectionId: "", productIds: [], startsAt: "", endsAt: "", active: true,
};

const scopeLabel: Record<string, string> = {
  ALL: "Toda a loja", BRAND: "Marca", COLLECTION: "Coleção", PRODUCT: "Produtos específicos",
};

export function PromotionsManager({
  promotions,
  collections,
  products,
}: {
  promotions: PromoRow[];
  collections: { id: string; name: string }[];
  products: { id: string; name: string; brand: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>(empty);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF(empty); setOpen(true); }
  function openEdit(p: PromoRow) {
    setF({
      id: p.id, name: p.name, type: p.type,
      value: p.type === "PERCENT" ? String(p.value) : (p.value / 100).toFixed(2).replace(".", ","),
      scope: p.scope, targetBrand: p.targetBrand ?? "HUX", collectionId: p.collectionId ?? "",
      productIds: p.productIds, startsAt: p.startsAt?.slice(0, 10) ?? "", endsAt: p.endsAt?.slice(0, 10) ?? "",
      active: p.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!f.name.trim() || !f.value.trim()) return toast("Preencha nome e valor.", "error");
    setSaving(true);
    const res = await upsertPromotionAction({
      id: f.id, name: f.name, type: f.type as never, value: f.value, scope: f.scope as never,
      targetBrand: f.targetBrand, collectionId: f.collectionId, productIds: f.productIds,
      startsAt: f.startsAt || undefined, endsAt: f.endsAt || undefined, active: f.active,
    });
    setSaving(false);
    if (res.ok) { toast("Promoção salva.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  async function remove(id: string) {
    await deletePromotionAction(id);
    toast("Promoção removida.", "success");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova promoção</button>
      </div>

      {promotions.length === 0 ? (
        <EmptyState icon={Percent} title="Nenhuma promoção" hint="Crie descontos por loja, marca, coleção ou produtos." />
      ) : (
        <div className="card divide-y divide-line">
          {promotions.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full border border-orange/40 bg-orange/10 font-display text-orange">
                {p.type === "PERCENT" ? `${p.value}%` : "R$"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{p.name}</p>
                  {p.active ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>}
                </div>
                <p className="text-xs text-muted">
                  {scopeLabel[p.scope]} · {p.type === "PERCENT" ? `${p.value}% off` : `${formatCents(p.value)} off`}
                </p>
              </div>
              <button onClick={() => openEdit(p)} className="grid size-9 place-items-center text-faint hover:text-orange"><Pencil size={15} /></button>
              <button onClick={() => remove(p.id)} className="grid size-9 place-items-center text-faint hover:text-negative"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar promoção" : "Nova promoção"} wide>
        <div className="space-y-4">
          <label className="block"><span className={label}>Nome *</span>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Esquenta HUX -20%" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Tipo</span>
              <select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}>
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </label>
            <label><span className={label}>{f.type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"} *</span>
              <input className="field" value={f.value} onChange={(e) => set("value", e.target.value)} placeholder={f.type === "PERCENT" ? "20" : "30,00"} inputMode="decimal" />
            </label>
          </div>
          <label className="block"><span className={label}>Aplicar em</span>
            <select className="field" value={f.scope} onChange={(e) => set("scope", e.target.value)}>
              {PROMOTION_SCOPES.map((s) => <option key={s} value={s}>{scopeLabel[s]}</option>)}
            </select>
          </label>

          {f.scope === "BRAND" && (
            <label className="block"><span className={label}>Marca</span>
              <select className="field" value={f.targetBrand} onChange={(e) => set("targetBrand", e.target.value)}>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          )}
          {f.scope === "COLLECTION" && (
            <label className="block"><span className={label}>Coleção</span>
              <select className="field" value={f.collectionId} onChange={(e) => set("collectionId", e.target.value)}>
                <option value="">— Selecione —</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          {f.scope === "PRODUCT" && (
            <div>
              <span className={label}>Produtos ({f.productIds.length} selecionados)</span>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius)] border border-line p-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-elevated">
                    <input
                      type="checkbox"
                      className="size-4 accent-orange"
                      checked={f.productIds.includes(p.id)}
                      onChange={(e) =>
                        set("productIds", e.target.checked ? [...f.productIds, p.id] : f.productIds.filter((x) => x !== p.id))
                      }
                    />
                    <span className="text-faint">{p.brand}</span> {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Início (opcional)</span>
              <input type="date" className="field" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </label>
            <label><span className={label}>Fim (opcional)</span>
              <input type="date" className="field" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" />
            Ativa
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
