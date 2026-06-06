"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button, EmptyState } from "@/components/ui";
import { CartLineItem } from "./CartLineItem";
import { CartSummary } from "./CartSummary";

export function CartView() {
  const { items, total, count } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Find something fresh to fill it up."
        action={
          <Link href="/" className="btn-primary">
            Browse products
          </Link>
        }
      />
    );
  }

  const goCheckout = () =>
    router.push(user ? "/checkout" : "/login?next=/checkout");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-mist">
        Your Cart <span className="text-mist/50">({count})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          {items.map((item) => (
            <CartLineItem key={item.product.id} item={item} />
          ))}
        </div>

        <div className="lg:col-span-1">
          <CartSummary total={total}>
            <Button onClick={goCheckout} fullWidth>
              Checkout <ArrowRight size={18} />
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
