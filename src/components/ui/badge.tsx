import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, type OrderStatus } from "@/lib/enums";

type Tone = "neutral" | "success" | "danger" | "info" | "warning" | "wholesale";

const toneClasses: Record<Tone, string> = {
  neutral: "border-line text-muted",
  success: "border-positive/40 text-positive bg-positive/10",
  danger: "border-negative/40 text-negative bg-negative/10",
  info: "border-info/40 text-info bg-info/10",
  warning: "border-warning/40 text-warning bg-warning/10",
  wholesale: "border-wholesale/40 text-wholesale bg-wholesale/10",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  const tone = (ORDER_STATUS_TONE[s] ?? "neutral") as Tone;
  return (
    <Badge tone={tone}>
      <span className="size-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
