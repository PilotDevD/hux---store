"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Ticket, Copy } from "lucide-react";
import { upsertCouponAction, deleteCouponAction } from "@/app/actions/backoffice-catalog";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";

export type CouponRow = {
  id: string; code: string; description: string | null; type: string; value: number;
  minOrder: number; maxUses: number | null; usedCount: number; perCustomerLimit: number | null;
  active: boolean; startsAt: string | null; endsAt: string | null;
};

type FormState = {
  id?: string; code: string; description: string; type: string; value: string;
  minOrder: string; maxUses: string; perCustomerLimit: string; startsAt: string; endsAt: string; active: boolean;
};

const empty: FormState = {
  code: "", description: "", type: "PERCENT", value: "", minOrder: "",
  maxUses: "", perCustomerLimit: "", startsAt: "", endsAt: "", active: true,
};

const typeLabel: Record<string, string> = { PERCENT: "Percentual", FIXED: "Valor fixo", FREE_SHIPPING: "Frete grátis" };

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>(empty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF(empty); setOpen(true); }
  function openEdit(c: CouponRow) {
    setF({
      id: c.id, code: c.code, description: c.description ?? "", type: c.type,
      value: c.type === "PERCENT" ? String(c.value) : c.type === "FIXED" ? (c.value / 100).toFixed(2).replace(".", ",") : "",
      minOrder: c.minOrder ? (c.minOrder / 100).toFixed(2).replace(".", ",") : "",
      maxUses: c.maxUses ? String(c.maxUses) : "", perCustomerLimit: c.perCustomerLimit ? String(c.perCustomerLimit) : "",
      startsAt: c.startsAt?.slice(0, 10) ?? "", endsAt: c.endsAt?.slice(0, 10) ?? "", active: c.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!f.code.trim()) return toast("Informe o código.", "error");
    setSaving(true);
    const res = await upsertCouponAction({
      id: f.id, code: f.code, description: f.description, type: f.type as never, value: f.value,
      minOrder: f.minOrder, maxUses: f.maxUses, perCustomerLimit: f.perCustomerLimit,
      startsAt: f.startsAt || undefined, endsAt: f.endsAt || undefined, active: f.active,
    });
    setSaving(false);
    if (res.ok) { toast("Cupom salvo.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  async function remove(id: string) {
    await deleteCouponAction(id);
    toast("Cupom removido.", "success");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo cupom</button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="Nenhum cupom" hint="Crie cupons de desconto ou frete grátis." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {coupons.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-[var(--radius)] border border-dashed border-orange/50 bg-orange/5 px-3 py-1.5 font-mono text-sm font-bold text-orange">{c.code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(c.code); toast("Código copiado.", "success"); }} className="text-faint hover:text-ink"><Copy size={14} /></button>
                </div>
                {c.active ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                {c.type === "PERCENT" ? `${c.value}% de desconto` : c.type === "FIXED" ? `${formatCents(c.value)} de desconto` : "Frete grátis"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {typeLabel[c.type]}
                {c.minOrder > 0 && ` · mín. ${formatCents(c.minOrder)}`}
                {` · usado ${c.usedCount}${c.maxUses ? `/${c.maxUses}` : ""}`}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(c)} className="btn btn-ghost px-3 py-1.5 text-xs"><Pencil size={13} /> Editar</button>
                <button onClick={() => remove(c.id)} className="btn btn-ghost px-3 py-1.5 text-xs text-negative"><Trash2 size={13} /> Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar cupom" : "Novo cupom"} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Código *</span>
              <input className="field font-mono uppercase" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="BEMVINDO10" />
            </label>
            <label><span className={label}>Tipo</span>
              <select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}>
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
                <option value="FREE_SHIPPING">Frete grátis</option>
              </select>
            </label>
          </div>
          {f.type !== "FREE_SHIPPING" && (
            <label className="block"><span className={label}>{f.type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"} *</span>
              <input className="field" value={f.value} onChange={(e) => set("value", e.target.value)} inputMode="decimal" />
            </label>
          )}
          <label className="block"><span className={label}>Descrição</span>
            <input className="field" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="10% na primeira compra" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={label}>Pedido mínimo (R$)</span>
              <input className="field" value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="0,00" inputMode="decimal" />
            </label>
            <label><span className={label}>Usos máximos</span>
              <input className="field" value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="∞" inputMode="numeric" />
            </label>
            <label><span className={label}>Limite por cliente</span>
              <input className="field" value={f.perCustomerLimit} onChange={(e) => set("perCustomerLimit", e.target.value)} placeholder="∞" inputMode="numeric" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Início (opcional)</span>
              <input type="date" className="field" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </label>
            <label><span className={label}>Fim (opcional)</span>
              <input type="date" className="field" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" /> Ativo
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
