"use client";

import { useActionState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/site";
import { SubmitButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function NewsletterForm() {
  const [state, action] = useActionState(subscribeNewsletter, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state) toast(state.message, state.ok ? "success" : "error");
  }, [state, toast]);

  return (
    <form action={action} className="flex gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="seu@email.com"
        aria-label="E-mail"
        className="field flex-1"
      />
      <SubmitButton pendingLabel="Enviando" className="shrink-0">
        Assinar <ArrowRight size={16} />
      </SubmitButton>
    </form>
  );
}
