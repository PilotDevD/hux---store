"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Bookmark, Check, X, Search } from "lucide-react";
import {
  createReservationAction, closeReservationAction, cancelReservationAction,
} from "@/app/actions/backoffice-reservas";
import { Modal } from "./modal";
import { EmptyState } from "./bo-ui";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";

export type VariantOption = {
  id: string; label: string; brand: string; stock: number; price: number;
};
export type ReservationRow = {
  id: string; productName: string; brand: string; size: string; color: string;
  qty: number; unitPrice: number; customerName: string; customerPhone: string | null;
  notes: string | null; status: string; orderNumber: string | null; createdAt: string;
};

export function ReservasManager({
  reservations,
  variants,
}: {
  reservations: ReservationRow[];
  variants: VariantOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [variantId, setVariantId] = useState("");
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const filtered = useMemo(() => {
    if (!search.trim()) return variants.slice(0, 30);
    const q = search.toLowerCase();
    return variants.filter((v) => v.label.toLowerCase().includes(q)).slice(0, 30);
  }, [search, variants]);

  function reset() {
    setVariantId(""); setSearch(""); setQty("1"); setCustomerName(""); setCustomerPhone(""); setNotes("");
  }

  async function create() {
    if (!variantId) return toast("Selecione o produto.", "error");
    if (!customerName.trim()) return toast("Informe o cliente.", "error");
    setBusy(true);
    const res = await createReservationAction({ variantId, qty: Number(qty) || 1, customerName, customerPhone, notes });
    setBusy(false);
    if (res.ok) { toast("Reserva criada. Estoque provisionado.", "success"); setOpen(false); reset(); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const [rowBusy, setRowBusy] = useState<string | null>(null);
  async function fechar(id: string) {
    setRowBusy(id);
    const res = await closeReservationAction(id);
    setRowBusy(null);
    if (res.ok) { toast(`Venda fechada! Pedido ${res.number}.`, "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }
  async function cancelar(id: string) {
    setRowBusy(id);
    const res = await cancelReservationAction(id);
    setRowBusy(null);
    if (res.ok) { toast("Reserva cancelada. Estoque devolvido.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const label = "data-label mb-1.5 block text-muted";

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button onClick={() => setOpen(true)} className="btn btn-primary"><Plus size={16} /> Nova reserva</button>
      </div>

      {reservations.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nenhuma reserva" hint="Reserve uma peça do estoque para um cliente e feche a venda com um clique." />
      ) : (
        <div className="card divide-y divide-line">
          {reservations.map((r) => {
            const active = r.status === "ATIVA";
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{r.productName}</p>
                    <Badge tone={active ? "warning" : r.status === "FINALIZADA" ? "success" : "neutral"}>
                      {r.status === "ATIVA" ? "Reservada" : r.status === "FINALIZADA" ? "Vendida" : "Cancelada"}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted">
                    {r.brand} · {r.size} · {r.color} · {r.qty}x · {formatCents(r.unitPrice * r.qty)}
                  </p>
                  <p className="text-xs text-muted">
                    {r.customerName}{r.customerPhone ? ` · ${r.customerPhone}` : ""} · {formatDate(r.createdAt)}
                    {r.orderNumber ? ` · pedido ${r.orderNumber}` : ""}
                  </p>
                </div>
                {active && (
                  <div className="flex gap-2">
                    <button onClick={() => fechar(r.id)} disabled={rowBusy === r.id} className="btn btn-primary px-3 py-2 text-xs">
                      {rowBusy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Fechar venda
                    </button>
                    <button onClick={() => cancelar(r.id)} disabled={rowBusy === r.id} className="btn btn-ghost px-3 py-2 text-xs text-negative">
                      <X size={13} /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova reserva" wide>
        <div className="space-y-4">
          <div>
            <span className={label}>Produto (variante) *</span>
            {selected ? (
              <div className="flex items-center justify-between rounded-[var(--radius)] border border-orange/50 bg-orange/5 px-3 py-2.5">
                <span className="text-sm">{selected.label} <span className="text-muted">· estoque {selected.stock}</span></span>
                <button onClick={() => { setVariantId(""); setSearch(""); }} className="text-faint hover:text-ink"><X size={15} /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input className="field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, tamanho, cor, SKU..." />
                </div>
                <div className="mt-2 max-h-52 overflow-y-auto rounded-[var(--radius)] border border-line">
                  {filtered.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setVariantId(v.id); }}
                      disabled={v.stock <= 0}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-elevated",
                        v.stock <= 0 && "opacity-40",
                      )}
                    >
                      <span>{v.label}</span>
                      <span className={cn("font-mono text-xs", v.stock <= 3 ? "text-warning" : "text-muted")}>{v.stock} un</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted">Nada encontrado.</p>}
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={label}>Quantidade</span>
              <input className="field" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
            </label>
            <label className="sm:col-span-2"><span className={label}>Cliente *</span>
              <input className="field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
            </label>
          </div>
          <label className="block"><span className={label}>Telefone (WhatsApp)</span>
            <input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </label>
          <label className="block"><span className={label}>Observações</span>
            <textarea className="field min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: separar até sexta, cliente confirmou por WhatsApp" />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={create} disabled={busy} className="btn btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />} Reservar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
