import { cn } from "@/lib/utils";

/**
 * Seamless infinite ticker. Renders two identical copies and animates the track
 * by -50% (exactly one copy width) so the loop is gapless — but ONLY if a single
 * copy is at least as wide as the viewport. To guarantee that on any screen we
 * repeat the items enough times per copy, and scale the duration with the
 * content length so the scroll speed stays constant.
 */
export function Marquee({
  items,
  className,
  fast = false,
  separator = "·",
}: {
  items: string[];
  className?: string;
  fast?: boolean;
  separator?: string;
}) {
  // Enough item-units per copy to exceed even ultrawide displays.
  const reps = Math.max(2, Math.ceil(28 / Math.max(1, items.length)));
  const seq = Array.from({ length: reps }).flatMap(() => items);

  // Constant px/s: distance (one copy) and time both scale with seq length.
  const perItem = fast ? 1.0 : 1.9;
  const duration = Math.max(14, seq.length * perItem);

  const group = (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden="true">
      {seq.map((item, i) => (
        <span key={i} className="flex items-center gap-8">
          <span>{item}</span>
          <span className="text-orange">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("relative flex overflow-hidden whitespace-nowrap", className)}>
      <div className="flex animate-marquee" style={{ animationDuration: `${duration}s` }}>
        {group}
        {group}
      </div>
    </div>
  );
}
