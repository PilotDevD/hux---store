"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Scissors, Pencil, Trash2, ArrowRight, Package } from "lucide-react";
import {
  upsertRawMaterialAction, deleteRawMaterialAction,
  upsertProductionJobAction, advanceProductionPhaseAction, deleteProductionJobAction,
} from "@/app/actions/backoffice-confeccao";
import { Modal } from "./modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  BRANDS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZES, SIZE_LABELS,
  PRODUCTION_PHASE_LABELS,
} from "@/lib/enums";

export type MaterialRow = {
  id: string; name: string; color: string; supplier: string | null; quantity: number;
  unit: string; totalCost: number; yieldPieces: number | null; notes: string | null;
};
export type JobRow = {
  id: string; rawMaterialId: string | null; brand: string | null; productType: string;
  modelName: string | null; color: string; size: string | null; qty: number;
  forCustomerName: string | null; phase: string; unitCost: number | null;
  dueDate: string | null; notes: string | null;
};

const phaseTone: Record<string, "warning" | "info" | "success"> = { CONFECCAO: "warning", ESTAMPARIA: "info", FINALIZADA: "success" };

export function ConfeccaoManager({ materials, jobs }: { materials: MaterialRow[]; jobs: JobRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const label = "data-label mb-1.5 block text-muted";
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // material modal
  const [matOpen, setMatOpen] = useState(false);
  const [mat, setMat] = useState<Record<string, string>>({});
  const setM = (k: string, v: string) => setMat((p) => ({ ...p, [k]: v }));
  function openMat(m?: MaterialRow) {
    setMat(m ? { id: m.id, name: m.name, color: m.color, supplier: m.supplier ?? "", quantity: String(m.quantity), unit: m.unit, totalCost: (m.totalCost / 100).toFixed(2).replace(".", ","), yieldPieces: m.yieldPieces ? String(m.yieldPieces) : "", notes: m.notes ?? "" } : { unit: "kg" });
    setMatOpen(true);
  }
  async function saveMat() {
    if (!mat.name || !mat.color) return toast("Preencha tecido e cor.", "error");
    setBusy(true);
    const res = await upsertRawMaterialAction({ id: mat.id, name: mat.name, color: mat.color, supplier: mat.supplier, quantity: Number(mat.quantity) || 0, unit: mat.unit, totalCost: mat.totalCost || "0", yieldPieces: mat.yieldPieces ? Number(mat.yieldPieces) : undefined, notes: mat.notes });
    setBusy(false);
    if (res.ok) { toast("Matéria-prima salva.", "success"); setMatOpen(false); router.refresh(); } else toast(res.error ?? "Erro.", "error");
  }

  // job modal
  const [jobOpen, setJobOpen] = useState(false);
  const [job, setJob] = useState<Record<string, string>>({});
  const setJ = (k: string, v: string) => setJob((p) => ({ ...p, [k]: v }));
  function openJob(j?: JobRow) {
    setJob(j ? { id: j.id, rawMaterialId: j.rawMaterialId ?? "", brand: j.brand ?? "", productType: j.productType, modelName: j.modelName ?? "", color: j.color, size: j.size ?? "", qty: String(j.qty), forCustomerName: j.forCustomerName ?? "", unitCost: j.unitCost ? (j.unitCost / 100).toFixed(2).replace(".", ",") : "", dueDate: j.dueDate?.slice(0, 10) ?? "", notes: j.notes ?? "" } : { productType: "CAMISA", qty: "1" });
    setJobOpen(true);
  }
  async function saveJob() {
    if (!job.color) return toast("Informe a cor.", "error");
    setBusy(true);
    const res = await upsertProductionJobAction({ id: job.id, rawMaterialId: job.rawMaterialId || undefined, brand: job.brand || undefined, productType: (job.productType || "CAMISA") as never, modelName: job.modelName, color: job.color, size: (job.size || undefined) as never, qty: Number(job.qty) || 1, forCustomerName: job.forCustomerName, unitCost: job.unitCost, dueDate: job.dueDate || undefined, notes: job.notes });
    setBusy(false);
    if (res.ok) { toast("Produção salva.", "success"); setJobOpen(false); router.refresh(); } else toast(res.error ?? "Erro.", "error");
  }
  async function advance(id: string) {
    setRowBusy(id);
    const res = await advanceProductionPhaseAction(id);
    setRowBusy(null);
    if (res.ok) { toast(res.addedToStock ? "Finalizada e adicionada ao estoque!" : "Fase avançada.", "success"); router.refresh(); } else toast(res.error ?? "Erro.", "error");
  }
  async function delJob(id: string) { setRowBusy(id); await deleteProductionJobAction(id); setRowBusy(null); toast("Removida.", "success"); router.refresh(); }
  async function delMat(id: string) { setRowBusy(id); await deleteRawMaterialAction(id); setRowBusy(null); toast("Removida.", "success"); router.refresh(); }

  return (
    <div className="space-y-8">
      {/* Matéria-prima */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-xl">Matéria-prima</h2>
          <button onClick={() => openMat()} className="btn btn-ghost px-3 py-2 text-xs"><Plus size={14} /> Comprar tecido</button>
        </div>
        {materials.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">Nenhuma matéria-prima cadastrada.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((m) => {
              const perPiece = m.yieldPieces && m.yieldPieces > 0 ? Math.round(m.totalCost / m.yieldPieces) : null;
              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{m.name} · {m.color}</p>
                      <p className="font-mono text-xs text-muted">{m.quantity}{m.unit} · {formatCents(m.totalCost)}{m.supplier ? ` · ${m.supplier}` : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openMat(m)} className="grid size-8 place-items-center text-faint hover:text-orange"><Pencil size={14} /></button>
                      <button onClick={() => delMat(m.id)} disabled={rowBusy === m.id} className="grid size-8 place-items-center text-faint hover:text-negative"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs">
                    {m.yieldPieces ? <span className="text-muted">rende ~<strong className="text-ink-soft">{m.yieldPieces}</strong> peças</span> : null}
                    {perPiece != null ? <span className="text-muted">custo/peça <strong className="text-brand">{formatCents(perPiece)}</strong></span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ordens de produção */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline text-xl">Ordens de produção</h2>
          <button onClick={() => openJob()} className="btn btn-primary px-3 py-2 text-xs"><Plus size={14} /> Nova produção</button>
        </div>
        {jobs.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">Nenhuma produção em andamento.</p>
        ) : (
          <div className="card divide-y divide-line">
            {jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{j.qty}x {j.brand ? `${j.brand} ` : ""}{PRODUCT_TYPE_LABELS[j.productType as keyof typeof PRODUCT_TYPE_LABELS] ?? j.productType}{j.modelName ? ` ${j.modelName}` : ""} · {j.color}{j.size ? `/${SIZE_LABELS[j.size as keyof typeof SIZE_LABELS] ?? j.size}` : ""}</p>
                    <Badge tone={phaseTone[j.phase] ?? "neutral"}>{PRODUCTION_PHASE_LABELS[j.phase] ?? j.phase}</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {j.forCustomerName ? `cliente ${j.forCustomerName} · ` : ""}{j.unitCost ? `custo/peça ${formatCents(j.unitCost)} · ` : ""}{j.dueDate ? `prazo ${formatDate(j.dueDate)}` : "sem prazo"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {j.phase !== "FINALIZADA" && (
                    <button onClick={() => advance(j.id)} disabled={rowBusy === j.id} className="btn btn-primary px-3 py-1.5 text-xs">
                      {rowBusy === j.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Avançar fase
                    </button>
                  )}
                  {j.phase === "FINALIZADA" && <span className="chip border-positive/40 text-positive"><Package size={12} /> Pronto</span>}
                  <button onClick={() => openJob(j)} className="grid size-8 place-items-center text-faint hover:text-orange"><Pencil size={14} /></button>
                  <button onClick={() => delJob(j.id)} disabled={rowBusy === j.id} className="grid size-8 place-items-center text-faint hover:text-negative"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Material modal */}
      <Modal open={matOpen} onClose={() => setMatOpen(false)} title={mat.id ? "Editar matéria-prima" : "Comprar tecido"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Tecido *</span><input className="field" value={mat.name ?? ""} onChange={(e) => setM("name", e.target.value)} placeholder="Dry Fit furado" /></label>
          <label><span className={label}>Cor *</span><input className="field" value={mat.color ?? ""} onChange={(e) => setM("color", e.target.value)} /></label>
          <label><span className={label}>Fornecedor</span><input className="field" value={mat.supplier ?? ""} onChange={(e) => setM("supplier", e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label><span className={label}>Quantidade</span><input className="field" value={mat.quantity ?? ""} onChange={(e) => setM("quantity", e.target.value)} inputMode="decimal" /></label>
            <label><span className={label}>Unidade</span><input className="field" value={mat.unit ?? "kg"} onChange={(e) => setM("unit", e.target.value)} placeholder="kg" /></label>
          </div>
          <label><span className={label}>Custo total (R$) *</span><input className="field" value={mat.totalCost ?? ""} onChange={(e) => setM("totalCost", e.target.value)} inputMode="decimal" /></label>
          <label><span className={label}>Rendimento (peças)</span><input className="field" value={mat.yieldPieces ?? ""} onChange={(e) => setM("yieldPieces", e.target.value)} inputMode="numeric" placeholder="ex: 40" /></label>
          <label className="sm:col-span-2"><span className={label}>Observações</span><input className="field" value={mat.notes ?? ""} onChange={(e) => setM("notes", e.target.value)} /></label>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button onClick={() => setMatOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={saveMat} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>

      {/* Job modal */}
      <Modal open={jobOpen} onClose={() => setJobOpen(false)} title={job.id ? "Editar produção" : "Nova produção"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Matéria-prima</span>
            <select className="field" value={job.rawMaterialId ?? ""} onChange={(e) => setJ("rawMaterialId", e.target.value)}>
              <option value="">— Nenhuma —</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.color}</option>)}
            </select>
          </label>
          <label><span className={label}>Marca</span>
            <select className="field" value={job.brand ?? ""} onChange={(e) => setJ("brand", e.target.value)}>
              <option value="">— Qualquer —</option>
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label><span className={label}>Tipo *</span>
            <select className="field" value={job.productType ?? "CAMISA"} onChange={(e) => setJ("productType", e.target.value)}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label><span className={label}>Modelo</span><input className="field" value={job.modelName ?? ""} onChange={(e) => setJ("modelName", e.target.value)} /></label>
          <label><span className={label}>Cor *</span><input className="field" value={job.color ?? ""} onChange={(e) => setJ("color", e.target.value)} /></label>
          <label><span className={label}>Tamanho</span>
            <select className="field" value={job.size ?? ""} onChange={(e) => setJ("size", e.target.value)}>
              <option value="">— </option>
              {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
            </select>
          </label>
          <label><span className={label}>Quantidade *</span><input className="field" value={job.qty ?? "1"} onChange={(e) => setJ("qty", e.target.value.replace(/\D/g, ""))} inputMode="numeric" /></label>
          <label><span className={label}>Cliente (se sob encomenda)</span><input className="field" value={job.forCustomerName ?? ""} onChange={(e) => setJ("forCustomerName", e.target.value)} /></label>
          <label><span className={label}>Custo/peça (R$)</span><input className="field" value={job.unitCost ?? ""} onChange={(e) => setJ("unitCost", e.target.value)} placeholder="herda da matéria-prima" inputMode="decimal" /></label>
          <label><span className={label}>Prazo</span><input type="date" className="field" value={job.dueDate ?? ""} onChange={(e) => setJ("dueDate", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={label}>Observações</span><input className="field" value={job.notes ?? ""} onChange={(e) => setJ("notes", e.target.value)} /></label>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button onClick={() => setJobOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={saveJob} disabled={busy} className="btn btn-primary">{busy && <Loader2 size={16} className="animate-spin" />} Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
