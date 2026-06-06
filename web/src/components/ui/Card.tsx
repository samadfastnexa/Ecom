import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong";
  glow?: boolean;
}

/** Frosted-glass surface used across the app. */
export function Card({
  variant = "default",
  glow = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        variant === "strong" ? "glass-strong" : "glass",
        glow && "water-card-glow",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
