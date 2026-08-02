import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Shimmering placeholder. `style` is accepted so callers can stagger
 * `animationDelay` down a list — a uniform block pulsing in unison reads as a
 * frozen frame rather than loading.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} />;
}
