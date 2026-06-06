"use client";

import { Wallet, Smartphone } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui";

const PAYMENTS: {
  value: PaymentMethod;
  label: string;
  icon: typeof Wallet;
}[] = [
  { value: "COD", label: "Cash on Delivery", icon: Wallet },
  { value: "JazzCash", label: "JazzCash", icon: Smartphone },
  { value: "EasyPaisa", label: "EasyPaisa", icon: Smartphone },
];

interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  number: string;
  onNumberChange: (value: string) => void;
}

export function PaymentSelector({
  value,
  onChange,
  number,
  onNumberChange,
}: PaymentSelectorProps) {
  const needsNumber = value !== "COD";

  return (
    <section className="glass p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-mist">
        <Wallet size={18} className="text-wave" /> Payment Method
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {PAYMENTS.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
              value === v
                ? "border-wave bg-wave/10 text-wave shadow-glow"
                : "border-white/10 bg-white/5 text-mist/70 hover:bg-white/10"
            )}
          >
            <Icon size={22} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {needsNumber && (
        <div className="mt-4">
          <Input
            label={`Mobile number for ${value}`}
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            placeholder="03XX XXXXXXX"
          />
        </div>
      )}
    </section>
  );
}
