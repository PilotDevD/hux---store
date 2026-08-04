import { cn } from "@/lib/utils";

// Official HUX wordmark (HU white, X green). Uses the real brand asset at
// public/hux-logo.png — designed for dark backgrounds (transparent PNG).
export function Logo({
  className,
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  if (markOnly) {
    // Compact green "X" mark for tight spots.
    return (
      <svg
        viewBox="0 0 46 40"
        className={cn("h-6 w-auto", className)}
        role="img"
        aria-label="HUX"
        fill="none"
      >
        <polygon points="2,2 13,2 44,40 33,40" fill="var(--color-brand)" />
        <polygon points="33,0 44,0 13,38 2,38" fill="var(--color-brand)" />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/hux-logo.png"
      alt="HUX"
      className={cn("h-7 w-auto select-none", className)}
      draggable={false}
    />
  );
}
