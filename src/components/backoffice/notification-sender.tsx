"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { sendNotificationAction } from "@/app/actions/backoffice-admin";
import { useToast } from "@/components/ui/toast";

export function NotificationSender({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("PROMO");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState("ALL");
  const [sending, setSending] = useState(false);
  const label = "data-label mb-1.5 block text-muted";

  async function send() {
    if (!title.trim() || !body.trim()) return toast("Preencha título e mensagem.", "error");
    setSending(true);
    const res = await sendNotificationAction({ title, body, type: type as never, link: link || undefined, target });
    setSending(false);
    if (res.ok) {
      toast(`Notificação enviada para ${res.count} cliente(s).`, "success");
      setTitle(""); setBody(""); setLink("");
      router.refresh();
    } else toast(res.error ?? "Erro ao enviar.", "error");
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="headline text-lg">Nova notificação</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Destinatário</span>
          <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="ALL">Todos os clientes</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label><span className={label}>Tipo</span>
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="PROMO">Promoção</option>
            <option value="SISTEMA">Sistema</option>
            <option value="PEDIDO">Pedido</option>
          </select>
        </label>
      </div>
      <label className="block"><span className={label}>Título *</span>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Drop novo no ar! 🔥" />
      </label>
      <label className="block"><span className={label}>Mensagem *</span>
        <textarea className="field min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder="A coleção Speed Lab acabou de chegar. Corra antes que esgote." />
      </label>
      <label className="block"><span className={label}>Link (opcional)</span>
        <input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/colecoes/speed-lab" />
      </label>
      <div className="flex justify-end">
        <button onClick={send} disabled={sending} className="btn btn-primary">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Enviar notificação
        </button>
      </div>
    </div>
  );
}
