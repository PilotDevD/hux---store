"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { pollNewSalesAction } from "@/app/actions/backoffice-notify";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/money";

const POLL_MS = 20000;

/**
 * Polls for new sales and plays a sound alert when one arrives (online order or
 * venda física). A floating bell toggles the sound on/off (saved per browser).
 * The AudioContext is resumed on the first user interaction so autoplay policies
 * don't block the beep.
 */
export function SaleNotifier() {
  const router = useRouter();
  const { toast } = useToast();
  const seenRef = useRef<string | null>(null);
  const initedRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem("hux_sale_sound") : null;
    const on = v !== "off";
    setEnabled(on);
    enabledRef.current = on;
  }, []);

  function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }

  function beep() {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const tones = [
      { freq: 880, at: 0 },
      { freq: 1174.66, at: 0.16 },
    ];
    for (const { freq, at } of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.24);
    }
  }

  // Resume audio on first user gesture (autoplay policy).
  useEffect(() => {
    const onGesture = () => {
      getCtx()?.resume().catch(() => {});
      window.removeEventListener("pointerdown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture);
    return () => window.removeEventListener("pointerdown", onGesture);
  }, []);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await pollNewSalesAction();
        if (!alive || !res.ok || !res.latestId) return;
        if (!initedRef.current) {
          seenRef.current = res.latestId;
          initedRef.current = true;
          return;
        }
        if (res.latestId !== seenRef.current) {
          seenRef.current = res.latestId;
          const label = res.channel === "MANUAL" ? "Venda física" : "Novo pedido";
          toast(`🔔 ${label} ${res.number} · ${formatCents(res.total ?? 0)}`, "success");
          if (enabledRef.current) beep();
          router.refresh();
        }
      } catch {
        /* ignore transient poll errors */
      }
    }
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    enabledRef.current = next;
    if (typeof localStorage !== "undefined") localStorage.setItem("hux_sale_sound", next ? "on" : "off");
    if (next) beep(); // preview the sound when enabling
  }

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? "Som de novas vendas ligado" : "Som de novas vendas desligado"}
      title={enabled ? "Som de novas vendas: ligado (clique para silenciar)" : "Som de novas vendas: desligado (clique para ativar)"}
      className="fixed bottom-4 right-4 z-50 grid size-11 place-items-center rounded-full border border-line bg-void/90 text-ink-soft shadow-lg backdrop-blur transition-colors hover:text-orange"
    >
      {enabled ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
