"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2, Plus, Trash2, Upload, Check } from "lucide-react";
import { parseNfAction, registerNfAction } from "@/app/actions/backoffice-nota-fiscal";
import { useToast } from "@/components/ui/toast";
import {
  BRANDS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZES, SIZE_LABELS, GENDERS, GENDER_LABELS,
} from "@/lib/enums";

type Row = { description: string; brand: string; type: string; gender: string; size: string; color: string; qty: string; unitCost: string };
const emptyRow = (): Row => ({ description: "", brand: "", type: "CAMISA", gender: "UNISSEX", size: "M", color: "", qty: "1", unitCost: "" });

export function NotaFiscalClient() {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");

  async function read() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast("Selecione a foto da nota primeiro.", "error");
    setReading(true);
    const fd = new FormData();
    fd.append("image", file);
    const res = await parseNfAction(fd);
    setReading(false);
    if (res.ok) {
      setSupplier(res.supplier);
      setRows(res.items.map((i) => ({ description: i.description, brand: i.brand, type: i.type || "CAMISA", gender: i.gender || "UNISSEX", size: i.size || "M", color: i.color, qty: String(i.qty), unitCost: i.unitCost ? String(i.unitCost).replace(".", ",") : "" })));
      toast(`Nota lida: ${res.items.length} item(ns). Confira antes de cadastrar.`, "success");
    } else {
      toast(res.error, res.aiUnavailable ? "info" : "error");
      if (rows.length === 0) setRows([emptyRow()]);
    }
  }

  const setRow = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  async function register() {
    if (rows.length === 0) return toast("Adicione ao menos um item.", "error");
    setSaving(true);
    const res = await registerNfAction({ supplier, items: rows.map((r) => ({ ...r, qty: Number(r.qty) || 1 })) });
    setSaving(false);
    if (res.ok) {
      toast(`Cadastrado! ${res.created} novo(s), ${res.updated} reabastecido(s).`, "success");
      setRows([]); setSupplier(""); setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } else toast(res.error ?? "Erro.", "error");
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="card p-6">
        <p className="eyebrow mb-3 flex items-center gap-2"><ScanLine size={14} /> Enviar nota fiscal</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn btn-ghost cursor-pointer">
            <Upload size={16} /> Escolher foto
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
          {fileName && <span className="truncate text-sm text-muted">{fileName}</span>}
          <button onClick={read} disabled={reading} className="btn btn-primary ml-auto">
            {reading ? <><Loader2 size={16} className="animate-spin" /> Lendo…</> : <><ScanLine size={16} /> Ler nota com IA</>}
          </button>
        </div>
        <p className="mt-3 text-xs text-faint">
          A IA extrai fornecedor e itens da foto. Você confere/edita tudo antes de cadastrar. Requer <code className="text-muted">ANTHROPIC_API_KEY</code> — sem a chave, preencha manualmente.
        </p>
      </div>

      {/* Review */}
      {(rows.length > 0 || supplier) && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="headline text-lg">Conferência</h2>
            <button onClick={() => setRows((r) => [...r, emptyRow()])} className="btn btn-ghost px-3 py-2 text-xs"><Plus size={14} /> Item</button>
          </div>
          <label className="mb-4 block max-w-sm"><span className={label}>Fornecedor</span>
            <input className="field" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nome do fornecedor" />
          </label>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-[var(--radius)] border border-line p-3 lg:grid-cols-[1.6fr_1fr_1.2fr_1fr_0.8fr_1fr_0.7fr_1fr_auto]">
                <input className="field py-2 lg:col-span-1" value={row.description} onChange={(e) => setRow(i, "description", e.target.value)} placeholder="Descrição" />
                <select className="field py-2" value={row.brand} onChange={(e) => setRow(i, "brand", e.target.value)}>
                  <option value="">Marca</option>{BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className="field py-2" value={row.type} onChange={(e) => setRow(i, "type", e.target.value)}>
                  {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
                </select>
                <select className="field py-2" value={row.gender} onChange={(e) => setRow(i, "gender", e.target.value)}>
                  {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                </select>
                <select className="field py-2" value={row.size} onChange={(e) => setRow(i, "size", e.target.value)}>
                  {SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                </select>
                <input className="field py-2" value={row.color} onChange={(e) => setRow(i, "color", e.target.value)} placeholder="Cor" />
                <input className="field py-2" value={row.qty} onChange={(e) => setRow(i, "qty", e.target.value.replace(/\D/g, ""))} placeholder="Qtd" inputMode="numeric" />
                <input className="field py-2" value={row.unitCost} onChange={(e) => setRow(i, "unitCost", e.target.value)} placeholder="Custo R$" inputMode="decimal" />
                <button onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} className="grid place-items-center text-faint hover:text-negative"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted">Itens iguais (marca+tipo+tamanho+cor) somam ao estoque existente; novos criam produto.</p>
            <button onClick={register} disabled={saving} className="btn btn-primary">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Cadastrando…</> : <><Check size={16} /> Cadastrar no estoque</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
