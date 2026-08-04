"use client";

import { Printer } from "lucide-react";

/** Triggers the browser print dialog (Save as PDF works from there). */
export function PrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 print:hidden"
    >
      <Printer size={16} /> {label}
    </button>
  );
}
