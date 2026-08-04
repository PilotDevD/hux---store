"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ClipboardList, Check, X, Pencil, Trash2 } from "lucide-react";
import {
  upsertBackorderAction, setBackorderStatusAction, deleteBackorderAction,
} from "@/app/actions/backoffice-encomendas";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  BRANDS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZES, SIZE_LABELS,
} from "@/lib/enums";

export type BackorderRow = {
  id: string; brand: string | null; productType: string; modelName: string | null;
  size: string; color: string; qty: number; customerName: string; customerPhone: string | null;
  expectedDate: string | null; estimatedPrice: number | null; notes: string | null;
  status: string; createdAt: string;
};

type FormState = {
  id?: string; brand: string; productType: string; modelName: string; size: string;
  color: string; qty: string; customerName: string; customerPhone: string;
  expectedDate: string; estimatedPrice: string; notes: string;
};

const empty: FormState = {
  brand: "", productType: "CAMISA", modelName: "", size: "M", color: "", qty: "1",
  customerName: "", customerPhone: "", expectedDate: "", estimatedPrice: "", notes: "",
};

const statusTone: Record<string, "warning" | "success" | "neutral"> = {
  PENDENTE: "warning", CONCLUIDA: "success", CANCELADA: "neutral",
};
const statusLabel: Record<string, string> = {
  PENDENTE: "Pendente", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
};

export function EncomendasManager({ backorders }: { backorders: BackorderRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<FormState>(empty);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF(empty); setOpen(true); }
  function openEdit(b: BackorderRow) {
    setF({
      id: b.id, brand: b.brand ?? "", productType: b.productType, modelName: b.modelName ?? "",
      size: b.size, color: b.color, qty: String(b.qty), customerName: b.customerName,
      customerPhone: b.customerPhone ?? "", expectedDate: b.expectedDate?.slice(0, 10) ?? "",
      estimatedPrice: b.estimatedPrice ? (b.estimatedPrice / 100).toFixed(2).replace(".", ",") : "",
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!f.customerName.trim() || !f.color.trim()) return toast("Preencha cliente e cor.", "error");
    setBusy(true);
    const res = await upsertBackorderAction({
      id: f.id, brand: f.brand || undefined, productType: f.productType as never, modelName: f.modelName,
      size: f.size as never, color: f.color, qty: Number(f.qty) || 1, customerName: f.customerName,
      customerPhone: f.customerPhone, expectedDate: f.expectedDate || undefined,
      estimatedPrice: f.estimatedPrice, notes: f.notes,
    });
    setBusy(false);
    if (res.ok) { toast("Encomenda salva.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  async function status(id: string, s: string) {
    setRowBusy(id);
    const res = await setBackorderStatusAction(id, s);
    setRowBusy(null);
    if (res.ok) { toast("Status atualizado.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function remove(id: string) {
    setRowBusy(id);
    await deleteBackorderAction(id);
    setRowBusy(null);
    toast("Encomenda removida.", "success");
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Nova encomenda</button>
      </div>

      {backorders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma encomenda" hint="Registre pedidos de peças fora de estoque ou sob medida." />
      ) : (
        <div className="card divide-y divide-line">
          {backorders.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">
                    {b.brand ? `${b.brand} ` : ""}{PRODUCT_TYPE_LABELS[b.productType as keyof typeof PRODUCT_TYPE_LABELS] ?? b.productType}
                    {b.modelName ? ` ${b.modelName}` : ""}
                  </p>
                  <Badge tone={statusTone[b.status] ?? "neutral"}>{statusLabel[b.status] ?? b.status}</Badge>
                </div>
                <p className="font-mono text-xs text-muted">
                  {SIZE_LABELS[b.size as keyof typeof SIZE_LABELS] ?? b.size} · {b.color} · {b.qty}x
                  {b.estimatedPrice ? ` · ~${formatCents(b.estimatedPrice)}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {b.customerName}{b.customerPhone ? ` · ${b.customerPhone}` : ""}
                  {b.expectedDate ? ` · previsão ${formatDate(b.expectedDate)}` : ""}
                </p>
                {b.notes && <p className="mt-0.5 text-xs text-faint">{b.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {b.status === "PENDENTE" && (
                  <button onClick={() => status(b.id, "CONCLUIDA")} disabled={rowBusy === b.id} className="btn btn-ghost px-3 py-1.5 text-xs text-positive">
                    {rowBusy === b.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Concluir
                  </button>
                )}
                {b.status !== "CANCELADA" && b.status !== "CONCLUIDA" && (
                  <button onClick={() => status(b.id, "CANCELADA")} disabled={rowBusy === b.id} className="btn btn-ghost px-3 py-1.5 text-xs">
                    <X size={13} /> Cancelar
                  </button>
                )}
                <button onClick={() => openEdit(b)} className="grid size-8 place-items-center text-faint hover:text-orange"><Pencil size={14} /></button>
                <button onClick={() => remove(b.id)} className="grid size-8 place-items-center text-faint hover:text-negative"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar encomenda" : "Nova encomenda"} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Marca</span>
              <select className="field" value={f.brand} onChange={(e) => set("brand", e.target.value)}>
                <option value="">— Qualquer —</option>
                {BRANDS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label><span className={label}>Tipo *</span>
              <select className="field" value={f.productType} onChange={(e) => set("productType", e.target.value)}>
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label><span className={label}>Modelo</span>
              <input className="field" value={f.modelName} onChange={(e) => set("modelName", e.target.value)} placeholder="Ex: Ultramaratonista" />
            </label>
            <label><span className={label}>Cor *</span>
              <input className="field" value={f.color} onChange={(e) => set("color", e.target.value)} placeholder="Ex: Preto" />
            </label>
            <label><span className={label}>Tamanho *</span>
              <select className="field" value={f.size} onChange={(e) => set("size", e.target.value)}>
                {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
              </select>
            </label>
            <label><span className={label}>Quantidade</span>
              <input className="field" value={f.qty} onChange={(e) => set("qty", e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Cliente *</span>
              <input className="field" value={f.customerName} onChange={(e) => set("customerName", e.target.value)} />
            </label>
            <label><span className={label}>Telefone (WhatsApp)</span>
              <input className="field" value={f.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="(11) 99999-9999" />
            </label>
            <label><span className={label}>Previsão de chegada</span>
              <input type="date" className="field" value={f.expectedDate} onChange={(e) => set("expectedDate", e.target.value)} />
            </label>
            <label><span className={label}>Valor estimado (R$)</span>
              <input className="field" value={f.estimatedPrice} onChange={(e) => set("estimatedPrice", e.target.value)} placeholder="0,00" inputMode="decimal" />
            </label>
          </div>
          <label className="block"><span className={label}>Observações</span>
            <textarea className="field min-h-16" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Detalhes do pedido, combinados com o cliente..." />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={save} disabled={busy} className="btn btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
