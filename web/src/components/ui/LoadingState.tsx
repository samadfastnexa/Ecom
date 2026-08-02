"use client";

import { Droplets } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Branded loading state, matching the mobile app's pulsing-drop screen.
 *
 * The bare spinner this replaces gave no sense of progress and looked
 * identical whether a request was fast or stuck.
 */
export function LoadingState({
  message,
  className,
  compact = false,
}: {
  message?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        compact ? "py-8" : "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex items-center justify-center">
        {/* Expanding ring, like a drop hitting water */}
        <span className="absolute h-14 w-14 animate-ping rounded-full bg-wave/20" />
        <span className="absolute h-14 w-14 rounded-full bg-wave/10" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-wave/20 text-wave">
          <Droplets size={20} className="animate-pulse" />
        </span>
      </span>

      {/* Three dots staggered so the eye reads motion, not a frozen frame */}
      <span className="flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-wave/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>

      {message && <p className="text-sm text-mist/50">{message}</p>}
    </div>
  );
}

/**
 * Row of shimmering placeholders shaped like the content that is coming.
 * Preferred over a spinner for lists — it preserves layout, so nothing
 * jumps when the real rows arrive.
 */
export function LoadingRows({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-12"
          // Stagger so the shimmer sweeps down the list instead of pulsing as
          // one solid block.
          style={{ animationDelay: `${i * 90}ms`, opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
}
