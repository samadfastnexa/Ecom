import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  children: ReactNode;
}

/** Pill used for tags, filters and badges. */
export function Chip({ active, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "chip",
        active
          ? "bg-wave-gradient text-white shadow-glow"
          : "border border-white/10 bg-white/5 text-mist/70",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
