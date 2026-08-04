"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, Star, X } from "lucide-react";
import { AddressForm } from "@/components/checkout/address-form";
import { deleteAddressAction } from "@/app/actions/checkout";
import { setDefaultAddressAction } from "@/app/actions/account";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Address = {
  id: string; label: string; recipient: string; cep: string; street: string;
  number: string; complement: string | null; district: string; city: string;
  state: string; isDefault: boolean;
};

export function AddressesManager({
  addresses,
  customerName,
}: {
  addresses: Address[];
  customerName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [pending, start] = useTransition();

  function remove(id: string) {
    start(async () => {
      await deleteAddressAction(id);
      toast("Endereço removido.", "success");
      router.refresh();
    });
  }
  function makeDefault(id: string) {
    start(async () => {
      await setDefaultAddressAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <div
            key={a.id}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-lg)] border p-5",
              a.isDefault ? "border-orange/50 bg-orange/5" : "border-line",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className={a.isDefault ? "text-orange" : "text-faint"} />
                <span className="font-semibold">{a.label}</span>
                {a.isDefault && (
                  <span className="chip border-orange/40 text-orange">Padrão</span>
                )}
              </div>
              <button
                onClick={() => remove(a.id)}
                disabled={pending}
                className="text-faint transition-colors hover:text-negative"
                aria-label="Remover endereço"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="mt-2.5 text-sm text-muted">
              <p>{a.recipient}</p>
              <p>{a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ""}</p>
              <p>{a.district} — {a.city}/{a.state}</p>
              <p>CEP {a.cep}</p>
            </div>
            {!a.isDefault && (
              <button
                onClick={() => makeDefault(a.id)}
                disabled={pending}
                className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-ink-soft hover:text-orange"
              >
                <Star size={13} /> Tornar padrão
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="data-label text-muted">Novo endereço</p>
            {addresses.length > 0 && (
              <button onClick={() => setShowForm(false)} className="text-faint hover:text-ink">
                <X size={16} />
              </button>
            )}
          </div>
          <AddressForm
            defaultRecipient={customerName}
            onCreated={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn btn-ghost">
          <Plus size={16} /> Adicionar endereço
        </button>
      )}
    </div>
  );
}
