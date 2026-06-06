"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { useOrders } from "../hooks/useOrders";
import { OrderCard } from "./OrderCard";

export function OrderList() {
  const { data: orders, loading, error } = useOrders();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-400/30 p-6 text-center text-rose-200">
        {error}
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet"
        description="Your order history will appear here."
        action={
          <Link href="/" className="btn-primary">
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-mist">My Orders</h1>
      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
