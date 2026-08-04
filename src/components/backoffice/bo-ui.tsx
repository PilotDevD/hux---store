import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="headline text-3xl md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  tone?: "default" | "positive" | "negative" | "info" | "warning";
  delta?: { value: number; positive: boolean } | null;
}) {
  const toneColor = {
    default: "text-orange",
    positive: "text-positive",
    negative: "text-negative",
    info: "text-info",
    warning: "text-warning",
  }[tone];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="data-label text-muted">{label}</p>
        {Icon && <Icon size={18} className={toneColor} />}
      </div>
      <p className="mt-3 font-display text-3xl leading-none">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta && (
          <span className={cn("font-mono text-xs", delta.positive ? "text-positive" : "text-negative")}>
            {delta.positive ? "▲" : "▼"} {Math.abs(delta.value)}%
          </span>
        )}
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-12 text-center">
      <div className="grid size-14 place-items-center rounded-full border border-line">
        <Icon size={22} className="text-faint" />
      </div>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="headline mb-4 text-xl">{children}</h2>;
}
