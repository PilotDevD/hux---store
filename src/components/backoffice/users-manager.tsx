"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { upsertUserAction, deleteUserAction } from "@/app/actions/backoffice-admin";
import { Modal } from "./modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ROLES, ROLE_LABELS, MODULES } from "@/lib/enums";
import { initials, cn } from "@/lib/utils";

export type UserRow = {
  id: string; username: string; displayName: string; role: string;
  commissionPct: number; permissions: string[]; active: boolean;
};

type FormState = {
  id?: string; username: string; displayName: string; role: string;
  password: string; commissionPct: string; permissions: string[];
};

const empty: FormState = {
  username: "", displayName: "", role: "VENDEDOR", password: "", commissionPct: "0", permissions: ["dashboard", "pedidos", "clientes"],
};

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>(empty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const label = "data-label mb-1.5 block text-muted";

  function openNew() { setF(empty); setOpen(true); }
  function openEdit(u: UserRow) {
    setF({ id: u.id, username: u.username, displayName: u.displayName, role: u.role, password: "", commissionPct: String(u.commissionPct), permissions: u.permissions });
    setOpen(true);
  }

  async function save() {
    if (!f.username.trim() || !f.displayName.trim()) return toast("Preencha usuário e nome.", "error");
    setSaving(true);
    const res = await upsertUserAction({
      id: f.id, username: f.username, displayName: f.displayName, role: f.role as never,
      password: f.password || undefined,
      commissionPct: f.commissionPct ? Number(f.commissionPct) : 0,
      permissions: f.permissions,
    });
    setSaving(false);
    if (res.ok) { toast("Usuário salvo.", "success"); setOpen(false); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  async function remove(id: string) {
    const res = await deleteUserAction(id);
    if (res.ok) { toast("Usuário removido.", "success"); router.refresh(); }
    else toast(res.error ?? "Erro.", "error");
  }

  const roleTone: Record<string, "danger" | "info" | "neutral"> = { ADMIN: "danger", GERENTE: "info", VENDEDOR: "neutral" };

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="headline text-xl">Usuários da equipe</h2>
        <button onClick={openNew} className="btn btn-primary"><Plus size={16} /> Novo usuário</button>
      </div>

      <div className="card divide-y divide-line">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated font-display text-sm text-orange">{initials(u.displayName)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{u.displayName}</p>
                <Badge tone={roleTone[u.role] ?? "neutral"}>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</Badge>
              </div>
              <p className="font-mono text-xs text-muted">@{u.username}{u.role === "VENDEDOR" && u.commissionPct ? ` · ${u.commissionPct}% comissão` : ""}</p>
            </div>
            <button onClick={() => openEdit(u)} className="grid size-9 place-items-center text-faint hover:text-orange"><Pencil size={15} /></button>
            <button onClick={() => remove(u.id)} className="grid size-9 place-items-center text-faint hover:text-negative"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Editar usuário" : "Novo usuário"} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Nome de exibição *</span>
              <input className="field" value={f.displayName} onChange={(e) => set("displayName", e.target.value)} />
            </label>
            <label><span className={label}>Usuário (login) *</span>
              <input className="field font-mono" value={f.username} onChange={(e) => set("username", e.target.value.toLowerCase())} />
            </label>
            <label><span className={label}>Perfil</span>
              <select className="field" value={f.role} onChange={(e) => set("role", e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </label>
            <label><span className={label}>Senha {f.id && "(deixe em branco p/ manter)"}</span>
              <input type="password" className="field" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder={f.id ? "••••••" : "mín. 6 caracteres"} />
            </label>
          </div>

          {f.role === "VENDEDOR" && (
            <>
              <label className="block sm:max-w-[50%]"><span className={label}>Comissão (%)</span>
                <input className="field" value={f.commissionPct} onChange={(e) => set("commissionPct", e.target.value)} inputMode="decimal" />
              </label>
              <div>
                <span className={label}>Módulos permitidos</span>
                <div className="flex flex-wrap gap-2">
                  {MODULES.map((m) => {
                    const on = f.permissions.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => set("permissions", on ? f.permissions.filter((x) => x !== m.id) : [...f.permissions, m.id])}
                        className={cn("chip transition-colors", on ? "border-orange bg-orange/10 text-orange" : "hover:border-ink-soft")}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {f.role !== "VENDEDOR" && (
            <p className="flex items-center gap-2 rounded-[var(--radius)] border border-info/30 bg-info/5 px-3 py-2.5 text-sm text-info">
              <ShieldCheck size={16} /> {f.role === "ADMIN" ? "Administradores têm acesso total, incluindo Configurações." : "Gerentes têm acesso total, exceto Configurações."}
            </p>
          )}

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
