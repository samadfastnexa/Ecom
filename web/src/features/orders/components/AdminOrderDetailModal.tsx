"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  CreditCard,
  Package,
  MessageSquare,
  Clock,
  Truck,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  Navigation,
} from "lucide-react";
import type { AdminOrder, DeliveryStatusOption } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ordersApi } from "@/lib/api";
import { Button, Modal, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface AdminOrderDetailModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated?: (order: AdminOrder) => void;
}

function Row({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-b border-white/10 py-3 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-wave">
        <Icon size={15} />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-mist/40">{label}</p>
        <p className="text-sm text-mist">{value}</p>
      </div>
    </div>
  );
}

function fmt(ts: string | null | undefined) {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ─── Balance indicator ────────────────────────────────────────────────────────

function BalanceChip({ amount, label }: { amount: number; label: string }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        isPositive && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        isNegative && "border-rose-400/30 bg-rose-400/10 text-rose-300",
        !isPositive && !isNegative && "border-white/10 bg-white/5 text-mist/60"
      )}
    >
      <Icon size={14} />
      <span className="text-xs uppercase tracking-wide text-inherit/60">{label}</span>
      <span className="ml-auto font-semibold">
        {isPositive ? "+" : ""}{formatPrice(Math.abs(amount))}
      </span>
    </div>
  );
}

// ─── Delivery status change ────────────────────────────────────────────────────

function DeliveryStatusRow({
  order,
  statuses,
  onUpdated,
}: {
  order: AdminOrder;
  statuses: DeliveryStatusOption[];
  onUpdated?: (updated: AdminOrder) => void;
}) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);

  const change = async (newStatus: string) => {
    setSaving(true);
    try {
      const updated = await ordersApi.adminUpdate(order.id, { delivery_status: newStatus });
      onUpdated?.(updated as AdminOrder);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-3 border-b border-white/10 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-wave">
        <Navigation size={15} />
      </span>
      <div className="flex-1">
        <p className="mb-1.5 text-xs uppercase tracking-wide text-mist/40">Delivery status</p>
        <select
          value={order.delivery_status ?? "Pending"}
          disabled={saving}
          onChange={(e) => change(e.target.value)}
          className={cn("input w-full py-1.5 text-sm", saving && "opacity-50")}
        >
          <option value="Pending">Pending</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Record payment section ────────────────────────────────────────────────────

function RecordPayment({
  order,
  onUpdated,
}: {
  order: AdminOrder;
  onUpdated?: (updated: AdminOrder) => void;
}) {
  const notify = useToast();
  const orderTotal = parseFloat(order.total_price);
  const [input, setInput] = useState(order.cash_amount ?? "0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset when a different order is shown
  useEffect(() => {
    setInput(order.cash_amount ?? "0");
    setError("");
  }, [order.id, order.cash_amount]);

  const received = parseFloat(input) || 0;
  const effect = received - orderTotal; // positive = credit, negative = owes
  const balanceBefore = order.customer_balance ?? 0;
  const balanceAfter = balanceBefore + (received - (parseFloat(order.cash_amount ?? "0") || 0));
  const isGuest = !order.user && !!order.guest_name;

  const save = async () => {
    const amount = parseFloat(input);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount (0 or more).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await ordersApi.adminUpdate(order.id, { cash_amount: input });
      notify("Payment recorded.");
      onUpdated?.(updated as AdminOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mist/50">
        <Wallet size={13} className="text-wave" /> Record Payment
      </p>

      {/* Order total row */}
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-mist/60">Order total</span>
        <span className="font-semibold text-mist">{formatPrice(orderTotal)}</span>
      </div>

      {/* Amount received input */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-mist/60 shrink-0">Amount received</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-sm text-mist/50">Rs.</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            className="input w-32 py-1 text-right text-sm"
          />
        </div>
      </div>

      {/* Effect preview */}
      {received > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          <BalanceChip
            amount={effect}
            label={effect > 0 ? "Credit on this order" : effect < 0 ? "Still owes" : "Exactly paid"}
          />
          {!isGuest && (
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-mist/60">
              <span>Account balance after</span>
              <span className={cn(
                "font-semibold",
                balanceAfter > 0 && "text-emerald-300",
                balanceAfter < 0 && "text-rose-300",
                balanceAfter === 0 && "text-mist/60"
              )}>
                {balanceAfter > 0 ? "+" : ""}{formatPrice(balanceAfter)}
              </span>
            </div>
          )}
          {isGuest && (
            <p className="text-xs text-mist/40">Guest order — balance not tracked on account.</p>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}

      <Button onClick={save} loading={saving} fullWidth>
        Save payment
      </Button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AdminOrderDetailModal({ order, onClose, onUpdated }: AdminOrderDetailModalProps) {
  const deliveryStatuses = useAsync(() => ordersApi.deliveryStatuses(), []);

  if (!order) return null;

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`Order #${order.id}`}
      className="max-w-xl"
    >
      <div className="flex flex-col gap-1 max-h-[80vh] overflow-y-auto pr-1">
        {/* Status + date */}
        <div className="mb-3 flex items-center justify-between">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-mist/50">{fmt(order.created_at)}</span>
        </div>

        {/* Customer */}
        <Row icon={User} label="Customer" value={
          <>
            {order.customer_name}
            {order.guest_name && (
              <span className="ml-1.5 rounded bg-amber-400/15 px-1 py-0.5 text-[10px] text-amber-300">guest</span>
            )}
          </>
        } />
        <Row icon={Mail} label="Email" value={order.customer_email} />
        <Row icon={Phone} label="Phone" value={order.customer_phone} />

        {/* Customer account balance (registered users only) */}
        {order.customer_balance !== null && order.customer_balance !== undefined && (
          <div className="flex gap-3 border-b border-white/10 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-wave">
              <Wallet size={15} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-mist/40">Account balance</p>
              <p className={cn(
                "text-sm font-semibold",
                order.customer_balance > 0 && "text-emerald-300",
                order.customer_balance < 0 && "text-rose-300",
                order.customer_balance === 0 && "text-mist/60"
              )}>
                {order.customer_balance > 0 ? "+" : ""}
                {formatPrice(order.customer_balance)}
                <span className="ml-1.5 text-xs font-normal text-mist/40">
                  {order.customer_balance > 0 ? "(credit)" : order.customer_balance < 0 ? "(owes)" : "(settled)"}
                </span>
              </p>
            </div>
          </div>
        )}

        <Row icon={MapPin} label="Shipping address" value={order.shipping_address} />
        <Row
          icon={CreditCard}
          label="Payment"
          value={`${order.payment_method}${order.payment_number ? ` (${order.payment_number})` : ""} — ${order.is_paid ? "Paid" : "Unpaid"}`}
        />

        {/* Items */}
        <div className="mt-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-mist/40">Items</p>
          <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 p-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-mist">
                  <Package size={14} className="text-wave" />
                  {item.product_details?.name ?? `Product #${item.product_id}`}
                  <span className="text-mist/50">×{item.quantity}</span>
                </span>
                <span className="text-mist/70">{formatPrice(item.price)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-sm font-semibold text-mist">
              <span>Total</span>
              <span>{formatPrice(order.total_price)}</span>
            </div>
          </div>
        </div>

        {/* Delivery status — always editable by staff */}
        <DeliveryStatusRow
          order={order}
          statuses={deliveryStatuses.data ?? []}
          onUpdated={onUpdated}
        />

        {/* Delivery */}
        {order.assigned_delivery_boy_name && (
          <Row icon={Truck} label="Delivery boy" value={order.assigned_delivery_boy_name} />
        )}
        {order.delivery_notes && (
          <Row icon={MessageSquare} label="Delivery notes" value={order.delivery_notes} />
        )}

        {/* Timestamps */}
        <Row icon={Clock} label="Ordered at" value={fmt(order.created_at)} />
        <Row icon={Truck} label="Shipped at" value={fmt(order.delivery_assigned_at)} />
        <Row icon={CheckCircle2} label="Delivered at" value={fmt(order.delivery_completed_at)} />

        {/* Payment recording */}
        <div className="mt-3">
          <RecordPayment order={order} onUpdated={onUpdated} />
        </div>
      </div>
    </Modal>
  );
}
