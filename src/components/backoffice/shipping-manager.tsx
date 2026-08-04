"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Truck } from "lucide-react";
import { upsertShippingRuleAction, deleteShippingRuleAction } from "@/app/actions/backoffice-admin";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { UFS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type ShippingRow = {
  id: string; name: string; matchType: string; ufList: string[]; price: number;
  freeAbove: number | null; etaDays: number; priority: number; active: boolean;
};

type FormState = {
  id?: string; name: string; matchType: string; ufList: string[]; price: string;
  freeAbove: string; etaDays: string; priority: string; active: boolean;
};

const empty: FormState = {
  name: "", matchType: "UF", ufList: [], price: "", freeAbove: "", etaDays: "5", priority: "10", active: true,
};

export function ShippingManager({ rules }: { rules: ShippingRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>(empty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF(empty); setOpen(true); }
  function openEdit(r: ShippingRow) {
    setF({
      id: r.id, name: r.name, matchType: r.matchType, ufList: r.ufList,
      price: (r.price / 100).toFixed(2).replace(".", ","),
      freeAbove: r.freeAbove ? (r.freeAbove / 100).toFixed(2).replace(".", ",") : "",
      etaDays: String(r.etaDays), priority: String(r.priority), active: r.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!f.name.trim()) return toast("Informe o nome.", "error");
    if (f.matchType === "UF" && f.ufList.length === 0) return toast("Selecione ao menos um estado.", "error");
    setSaving(true);
    const res = await upsertShippingRuleAction({
      id: f.id, name: f.name, matchType: f.matchType as never, ufList: f.ufList as never,
      price: f.price || "0", freeAbove: f.freeAbove || undefined, etaDays: Number(f.etaDays) || 1, priority: Number(f.priority) || 0, active: f.active,
    });
    setSaving(false);
    if (res.ok) { toast("Regra salva.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  async function remove(id: string) {
    await deleteShippingRuleAction(id);
    toast("Regra removida.", "success");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova regra</button>
      </div>

      {rules.length === 0 ? (
        <EmptyState icon={Truck} title="Nenhuma regra de frete" hint="Defina valores por região e frete grátis acima de um valor." />
      ) : (
        <div className="card divide-y divide-line">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full border border-line"><Truck size={18} className="text-orange" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  {r.active ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>}
                  {r.matchType === "ALL" && <Badge tone="info">Nacional</Badge>}
                </div>
                <p className="text-xs text-muted">
                  {r.matchType === "UF" ? r.ufList.join(", ") : "Todos os estados"} · {formatCents(r.price)} · {r.etaDays} dias
                  {r.freeAbove ? ` · grátis acima de ${formatCents(r.freeAbove)}` : ""}
                </p>
              </div>
              <button onClick={() => openEdit(r)} className="grid size-9 place-items-center text-faint hover:text-orange"><Pencil size={15} /></button>
              <button onClick={() => remove(r.id)} className="grid size-9 place-items-center text-faint hover:text-negative"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar regra" : "Nova regra de frete"} wide>
        <div className="space-y-4">
          <label className="block"><span className={label}>Nome *</span>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sudeste" />
          </label>
          <label className="block"><span className={label}>Abrangência</span>
            <select className="field" value={f.matchType} onChange={(e) => set("matchType", e.target.value)}>
              <option value="UF">Estados específicos</option>
              <option value="ALL">Todos os estados (fallback nacional)</option>
            </select>
          </label>
          {f.matchType === "UF" && (
            <div>
              <span className={label}>Estados ({f.ufList.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {UFS.map((uf) => {
                  const on = f.ufList.includes(uf);
                  return (
                    <button
                      key={uf}
                      onClick={() => set("ufList", on ? f.ufList.filter((x) => x !== uf) : [...f.ufList, uf])}
                      className={cn("rounded-[var(--radius)] border px-2.5 py-1.5 font-mono text-xs transition-colors", on ? "border-orange bg-orange/10 text-orange" : "border-line text-ink-soft hover:border-ink-soft")}
                    >
                      {uf}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Valor do frete (R$)</span>
              <input className="field" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="19,90" inputMode="decimal" />
            </label>
            <label><span className={label}>Frete grátis acima de (R$)</span>
              <input className="field" value={f.freeAbove} onChange={(e) => set("freeAbove", e.target.value)} placeholder="opcional" inputMode="decimal" />
            </label>
            <label><span className={label}>Prazo (dias úteis)</span>
              <input className="field" value={f.etaDays} onChange={(e) => set("etaDays", e.target.value)} inputMode="numeric" />
            </label>
            <label><span className={label}>Prioridade</span>
              <input className="field" value={f.priority} onChange={(e) => set("priority", e.target.value)} inputMode="numeric" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-orange" /> Ativa
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
