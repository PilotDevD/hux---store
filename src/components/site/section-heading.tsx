import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  link,
  linkLabel = "Ver tudo",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  link?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div>
        {eyebrow && (
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="inline-block h-px w-8 bg-orange" />
            {eyebrow}
          </p>
        )}
        <h2 className="headline text-4xl sm:text-5xl md:text-6xl">{title}</h2>
      </div>
      {link && (
        <Link
          href={link}
          className="group hidden shrink-0 items-center gap-2 pb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:text-orange sm:flex"
        >
          {linkLabel}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
