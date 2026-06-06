"use client";

import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";

interface CartSummaryProps {
  total: number;
  children: ReactNode;
  title?: string;
}

/** Sticky order-summary panel reused by cart and checkout. */
export function CartSummary({
  total,
  children,
  title = "Order Summary",
}: CartSummaryProps) {
  return (
    <div className="glass-strong sticky top-24 flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-mist">{title}</h2>
      <div className="flex justify-between text-sm text-mist/70">
        <span>Subtotal</span>
        <span>{formatPrice(total)}</span>
      </div>
      <div className="flex justify-between text-sm text-mist/70">
        <span>Delivery</span>
        <span className="text-emerald-300">Free</span>
      </div>
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between text-lg font-bold text-mist">
          <span>Total</span>
          <span className="text-wave">{formatPrice(total)}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
