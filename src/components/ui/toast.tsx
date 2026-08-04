"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastCtx = createContext<{
  toast: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2.5 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-rise flex items-start gap-3 rounded-[var(--radius)] border bg-elevated px-4 py-3 shadow-2xl",
              t.tone === "success" && "border-positive/40",
              t.tone === "error" && "border-negative/40",
              t.tone === "info" && "border-info/40",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {t.tone === "success" && <CheckCircle2 size={18} className="text-positive" />}
              {t.tone === "error" && <AlertTriangle size={18} className="text-negative" />}
              {t.tone === "info" && <Info size={18} className="text-info" />}
            </span>
            <p className="text-sm text-ink-soft leading-snug flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-faint hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { toast: (_m: string, _t?: ToastTone) => {} };
  return ctx;
}
