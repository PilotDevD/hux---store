"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { addAddressAction, lookupCepAction } from "@/app/actions/checkout";
import { useToast } from "@/components/ui/toast";
import { UFS } from "@/lib/enums";
import { maskCep, onlyDigits } from "@/lib/utils";

type Fields = {
  label: string;
  recipient: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const EMPTY: Fields = {
  label: "", recipient: "", cep: "", street: "", number: "",
  complement: "", district: "", city: "", state: "",
};

export function AddressForm({
  onCreated,
  defaultRecipient = "",
}: {
  onCreated?: (addressId: string) => void;
  defaultRecipient?: string;
}) {
  const { toast } = useToast();
  const [fields, setFields] = useState<Fields>({ ...EMPTY, recipient: defaultRecipient });
  const [cepLoading, startCep] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Fields, v: string) => setFields((f) => ({ ...f, [k]: v }));

  function handleCepBlur() {
    const cep = onlyDigits(fields.cep);
    if (cep.length !== 8) return;
    startCep(async () => {
      const res = await lookupCepAction(cep);
      if (res.ok) {
        setFields((f) => ({
          ...f,
          street: res.street || f.street,
          district: res.district || f.district,
          city: res.city || f.city,
          state: res.state || f.state,
        }));
      } else {
        toast(res.error, "error");
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    const res = await addAddressAction(null, fd);
    setSubmitting(false);
    if (res.ok && res.addressId) {
      toast("Endereço salvo.", "success");
      setFields({ ...EMPTY, recipient: defaultRecipient });
      onCreated?.(res.addressId);
    } else {
      toast(res.error ?? "Erro ao salvar endereço.", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="data-label mb-1.5 block text-muted">Identificação (ex: Casa, Trabalho)</span>
        <input className="field" value={fields.label} onChange={(e) => set("label", e.target.value)} placeholder="Casa" />
      </label>
      <label className="sm:col-span-2">
        <span className="data-label mb-1.5 block text-muted">Destinatário *</span>
        <input className="field" value={fields.recipient} onChange={(e) => set("recipient", e.target.value)} required />
      </label>

      <label>
        <span className="data-label mb-1.5 block text-muted">CEP *</span>
        <div className="relative">
          <input
            className="field pr-10"
            value={fields.cep}
            onChange={(e) => set("cep", maskCep(e.target.value))}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            inputMode="numeric"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint">
            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </span>
        </div>
      </label>
      <label>
        <span className="data-label mb-1.5 block text-muted">Estado (UF) *</span>
        <select className="field" value={fields.state} onChange={(e) => set("state", e.target.value)} required>
          <option value="">—</option>
          {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </label>

      <label className="sm:col-span-2">
        <span className="data-label mb-1.5 block text-muted">Rua *</span>
        <input className="field" value={fields.street} onChange={(e) => set("street", e.target.value)} required />
      </label>
      <label>
        <span className="data-label mb-1.5 block text-muted">Número *</span>
        <input className="field" value={fields.number} onChange={(e) => set("number", e.target.value)} required />
      </label>
      <label>
        <span className="data-label mb-1.5 block text-muted">Complemento</span>
        <input className="field" value={fields.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Apto, bloco..." />
      </label>
      <label>
        <span className="data-label mb-1.5 block text-muted">Bairro *</span>
        <input className="field" value={fields.district} onChange={(e) => set("district", e.target.value)} required />
      </label>
      <label>
        <span className="data-label mb-1.5 block text-muted">Cidade *</span>
        <input className="field" value={fields.city} onChange={(e) => set("city", e.target.value)} required />
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={submitting} className="btn btn-primary w-full sm:w-auto">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Salvar endereço
        </button>
      </div>
    </form>
  );
}
