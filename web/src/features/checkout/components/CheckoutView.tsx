"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplet, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { Button, Card, useToast } from "@/components/ui";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { AddressForm } from "./AddressForm";
import { PaymentSelector } from "./PaymentSelector";

export function CheckoutView() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const notify = useToast();

  const [address, setAddress] = useState(user?.address || "");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [payNumber, setPayNumber] = useState(user?.phone_number || "");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center text-mist/70">
        <p>Your cart is empty.</p>
        <button onClick={() => router.push("/")} className="btn-primary mt-4">
          Browse products
        </button>
      </Card>
    );
  }

  const placeOrder = async () => {
    setError(null);
    if (!address.trim()) {
      setError("Please enter a shipping address.");
      return;
    }
    if (payment !== "COD" && payNumber.trim().length < 10) {
      setError("Enter a valid mobile number for mobile payment.");
      return;
    }

    setPlacing(true);
    try {
      const order = await ordersApi.create({
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total_price: total.toFixed(2),
        shipping_address: address,
        payment_method: payment,
        payment_number: payment !== "COD" ? payNumber : null,
      });
      clear();
      notify(`Order #${order.id} placed successfully!`);
      router.push("/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to place order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-mist">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AddressForm value={address} onChange={setAddress} />
          <PaymentSelector
            value={payment}
            onChange={setPayment}
            number={payNumber}
            onNumberChange={setPayNumber}
          />
        </div>

        <div className="lg:col-span-1">
          <CartSummary total={total} title="Your Order">
            <div className="flex flex-col gap-2">
              {items.map((i) => (
                <div
                  key={i.product.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-1.5 text-mist/70">
                    <Droplet size={12} className="text-wave/60" />
                    <span className="line-clamp-1">
                      {i.product.name} × {i.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-mist">
                    {formatPrice(parseFloat(i.product.price) * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <Button onClick={placeOrder} loading={placing} fullWidth>
              <CheckCircle2 size={18} /> Place Order
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
