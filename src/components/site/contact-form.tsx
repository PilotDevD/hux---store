"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { sendContactMessage } from "@/app/actions/site";
import { SubmitButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ContactForm() {
  const [state, action] = useActionState(sendContactMessage, null);
  const { toast } = useToast();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    toast(state.message, state.ok ? "success" : "error");
    if (state.ok) ref.current?.reset();
  }, [state, toast]);

  const label = "data-label mb-1.5 block text-muted";

  return (
    <form ref={ref} action={action} className="card space-y-4 p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Nome *</span>
          <input name="name" required className="field" placeholder="Seu nome" />
        </label>
        <label><span className={label}>E-mail *</span>
          <input type="email" name="email" required className="field" placeholder="voce@email.com" />
        </label>
      </div>
      <label className="block"><span className={label}>Assunto</span>
        <input name="subject" className="field" placeholder="Dúvida sobre um pedido, parceria, imprensa..." />
      </label>
      <label className="block"><span className={label}>Mensagem *</span>
        <textarea name="message" required className="field min-h-32 resize-y" placeholder="Como podemos ajudar?" />
      </label>
      <SubmitButton pendingLabel="Enviando…"><Send size={16} /> Enviar mensagem</SubmitButton>
    </form>
  );
}
