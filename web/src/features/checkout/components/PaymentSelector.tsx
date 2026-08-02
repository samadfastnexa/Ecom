"use client";

import { Wallet } from "lucide-react";

/**
 * The business is cash-only, so there is nothing to choose. This stays a
 * component rather than being deleted so the checkout layout is unchanged and
 * the customer can see how they will be charged.
 */
export function PaymentSelector() {
  return (
    <section className="glass p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-mist">
        <Wallet size={18} className="text-wave" /> Payment Method
      </h2>
      <div className="flex items-center gap-3 rounded-xl border border-wave bg-wave/10 p-4">
        <Wallet size={22} className="shrink-0 text-wave" />
        <div>
          <p className="text-sm font-medium text-wave">Cash on Delivery</p>
          <p className="text-xs text-mist/50">
            Pay the rider in cash when your order arrives.
          </p>
        </div>
      </div>
    </section>
  );
}
