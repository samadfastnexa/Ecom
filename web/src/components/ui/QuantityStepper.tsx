"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  size?: "sm" | "md";
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  size = "md",
}: QuantityStepperProps) {
  const btn =
    size === "sm"
      ? "h-8 w-8 border border-white/10 bg-white/5"
      : "h-10 w-10";
  const label = size === "sm" ? "w-9 text-sm" : "w-10";

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        size === "md" && "glass p-1"
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-lg text-mist transition hover:bg-white/10",
          btn
        )}
        aria-label="Decrease quantity"
      >
        <Minus size={size === "sm" ? 14 : 16} />
      </button>
      <span className={cn("text-center font-semibold text-mist", label)}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={cn(
          "flex items-center justify-center rounded-lg text-mist transition hover:bg-white/10",
          btn
        )}
        aria-label="Increase quantity"
      >
        <Plus size={size === "sm" ? 14 : 16} />
      </button>
    </div>
  );
}
