import { Check } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function OrderTimeline({
  status,
  events,
}: {
  status: string;
  events: { status: string; note: string | null; createdAt: Date }[];
}) {
  if (status === "CANCELADO") {
    const ev = events.find((e) => e.status === "CANCELADO");
    return (
      <div className="card border-negative/40 p-5">
        <p className="font-semibold text-negative">Pedido cancelado</p>
        {ev && <p className="mt-1 text-sm text-muted">{ev.note}</p>}
      </div>
    );
  }

  const currentIndex = ORDER_FLOW.indexOf(status as OrderStatus);
  const eventByStatus = new Map(events.map((e) => [e.status, e]));

  return (
    <div className="card p-6">
      <p className="eyebrow mb-5">Acompanhamento</p>
      <ol className="relative">
        {ORDER_FLOW.map((step, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const ev = eventByStatus.get(step);
          const isLast = i === ORDER_FLOW.length - 1;
          return (
            <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[13px] top-7 h-full w-0.5",
                    done ? "bg-orange" : "bg-line",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-[1] grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  done && "border-orange bg-orange text-void",
                  current && "border-orange bg-graphite text-orange",
                  !done && !current && "border-line bg-graphite text-faint",
                )}
              >
                {done ? <Check size={14} /> : <span className={cn("size-2 rounded-full", current ? "animate-pulse-dot bg-orange" : "bg-faint")} />}
              </span>
              <div className="pt-0.5">
                <p className={cn("font-semibold", current ? "text-orange" : done ? "text-ink" : "text-muted")}>
                  {ORDER_STATUS_LABELS[step]}
                </p>
                {ev && <p className="mt-0.5 text-xs text-muted">{ev.note}</p>}
                {ev && <p className="mt-0.5 font-mono text-[0.68rem] text-faint">{formatDateTime(ev.createdAt)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
