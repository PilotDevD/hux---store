"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-void/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        onClick={onClose}
        className="fixed inset-0"
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={title}
        className={`relative z-[1] my-auto w-full ${wide ? "max-w-2xl" : "max-w-md"} animate-rise rounded-[var(--radius-lg)] border border-line bg-graphite shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="headline text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
