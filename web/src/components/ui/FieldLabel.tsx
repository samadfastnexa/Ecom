"use client";

import { cn } from "@/lib/cn";

/**
 * A field label with a small "Required" / "Optional" pill.
 *
 * Mirrors the pill the mobile app shows on every form field, so staff reading
 * either surface can tell at a glance what they may skip. Before this, web
 * signalled "required" with a hand-written red asterisk on three fields out of
 * dozens, and the mobile app used pills — the two never matched.
 */

export type Requirement = "required" | "optional";

export function RequirementPill({ requirement }: { requirement: Requirement }) {
  const required = requirement === "required";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        required
          ? "bg-rose-500/15 text-rose-300"
          : "bg-white/10 text-mist/60"
      )}
    >
      {required ? "Required" : "Optional"}
    </span>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  requirement,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  requirement?: Requirement;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("label flex items-center gap-2", className)}
    >
      <span>{children}</span>
      {requirement && <RequirementPill requirement={requirement} />}
    </label>
  );
}
