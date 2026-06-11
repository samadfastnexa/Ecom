"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  UserX,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Package,
  CheckCircle2,
  Wallet,
  Clock,
} from "lucide-react";
import type {
  CreateAdminOrderPayload,
  CustomerOrderStats,
  PaymentMethod,
  Product,
} from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ordersApi } from "@/lib/api";
import { productsApi } from "@/lib/api/products";
import { plantApi } from "@/lib/api/plant";
import { Button, Input, Modal, useToast } from "@/components/ui";
import { useDeliveryBoys } from "../hooks/useAdminOrders";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type CustomerMode = "existing" | "guest";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// ─── Address autocomplete ─────────────────────────────────────────────────────

function AddressInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQ = useDebouncedValue(value, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    ordersApi.addressSuggestions(debouncedQ).then((list) => {
      setSuggestions(list);
      setOpen(list.length > 0);
    });
  }, [debouncedQ]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        label="Delivery address"
        placeholder="House #, Street, Area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        icon={<MapPin size={15} />}
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/15 bg-abyss shadow-lg">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-mist hover:bg-white/10"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-wave" />
                <span className="line-clamp-2">{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Customer stats card ──────────────────────────────────────────────────────

function CustomerStatsCard({ userId }: { userId: number }) {
  const [stats, setStats] = useState<CustomerOrderStats | null>(null);

  useEffect(() => {
    ordersApi.customerStats(userId).then(setStats).catch(() => null);
  }, [userId]);

  if (!stats) return null;

  const balanceColor =
    stats.account_balance === null
      ? "text-mist/50"
      : stats.account_balance < 0
      ? "text-rose-300"
      : stats.account_balance > 0
      ? "text-emerald-300"
      : "text-mist/50";

  const lastDate = stats.last_order_date
    ? new Date(stats.last_order_date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-4">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-mist/40">
          <Package size={10} /> Total Orders
        </span>
        <span className="text-sm font-semibold text-mist">{stats.total_orders}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-mist/40">
          <CheckCircle2 size={10} /> Delivered
        </span>
        <span className="text-sm font-semibold text-mist">{stats.delivered_count}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-mist/40">
          <Clock size={10} /> Last Order
        </span>
        <span className="text-sm font-semibold text-mist">{lastDate}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-mist/40">
          <Wallet size={10} /> Balance
        </span>
        <span className={cn("text-sm font-semibold", balanceColor)}>
          {stats.account_balance === null
            ? "—"
            : (stats.account_balance >= 0 ? "+" : "") +
              formatPrice(stats.account_balance)}
        </span>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function CreateOrderModal({ open, onClose, onCreated }: CreateOrderModalProps) {
  const notify = useToast();
  const deliveryBoys = useDeliveryBoys();
  const customers = useAsync(() => plantApi.customers(), []);
  const products = useAsync(() => productsApi.list(), []);

  const [mode, setMode] = useState<CustomerMode>("existing");
  const [userId, setUserId] = useState<number | "">("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [riderId, setRiderId] = useState<number | "">("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill address when selecting existing customer
  useEffect(() => {
    if (mode === "existing" && userId) {
      const c = customers.data?.find((c) => c.id === userId);
      if (c?.address) setAddress(c.address);
    }
  }, [userId, mode, customers.data]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setMode("existing");
      setUserId("");
      setGuestName("");
      setGuestPhone("");
      setAddress("");
      setPaymentMethod("COD");
      setPaymentNumber("");
      setRiderId("");
      setDeliveryNotes("");
      setCart([]);
      setError("");
    }
  }, [open]);

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const total = cart.reduce(
    (sum, c) => sum + parseFloat(c.product.price) * c.quantity,
    0
  );

  const submit = async () => {
    setError("");
    if (cart.length === 0) { setError("Add at least one product."); return; }
    if (!address.trim()) { setError("Delivery address is required."); return; }
    if (mode === "guest" && !guestName.trim()) { setError("Guest name is required."); return; }

    const payload: CreateAdminOrderPayload = {
      shipping_address: address,
      payment_method: paymentMethod,
      payment_number: paymentNumber || undefined,
      assigned_delivery_boy: riderId || null,
      delivery_notes: deliveryNotes || undefined,
      status: "Processing",
      items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
    };

    if (mode === "existing" && userId) {
      payload.user_id = userId as number;
    } else {
      payload.guest_name = guestName;
      payload.guest_phone = guestPhone || undefined;
    }

    setSaving(true);
    try {
      await ordersApi.adminCreate(payload);
      notify("Order created successfully.");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Order" className="max-w-2xl">
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* Customer section */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mist/50">Customer</p>
          <div className="flex gap-2">
            {(["existing", "guest"] as CustomerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  mode === m
                    ? "border-wave bg-wave/10 text-wave"
                    : "border-white/10 bg-white/5 text-mist/60 hover:bg-white/10"
                )}
              >
                {m === "existing" ? <User size={14} /> : <UserX size={14} />}
                {m === "existing" ? "Existing user" : "Guest (call-in)"}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : "")}
                className="input text-sm"
              >
                <option value="">— Select customer —</option>
                {customers.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `· ${c.phone}` : ""}{c.address ? ` (${c.address.slice(0, 28)})` : ""}
                  </option>
                ))}
              </select>
              {userId !== "" && <CustomerStatsCard userId={userId as number} />}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Name"
                placeholder="Customer name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                icon={<User size={15} />}
              />
              <Input
                label="Phone"
                placeholder="03xx-xxxxxxx"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                icon={<Phone size={15} />}
              />
            </div>
          )}
        </div>

        {/* Delivery address with autocomplete */}
        <AddressInput value={address} onChange={setAddress} />

        {/* Products */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-mist/50">Products</p>

          {products.loading ? (
            <p className="text-sm text-mist/40">Loading products…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {products.data?.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className={cn(
                      "flex flex-col rounded-xl border p-3 text-left text-sm transition",
                      inCart
                        ? "border-wave bg-wave/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <span className="font-medium text-mist leading-tight">{product.name}</span>
                    <span className="mt-1 text-xs text-mist/60">{formatPrice(product.price)}</span>
                    {inCart && (
                      <span className="mt-1 text-xs font-semibold text-wave">×{inCart.quantity} in cart</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cart */}
          {cart.length > 0 && (
            <div className="mt-1 flex flex-col gap-1 rounded-xl border border-white/10 p-3">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-mist">{product.name}</span>
                  <button
                    onClick={() => changeQty(product.id, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-mist hover:bg-white/20"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-mist">{quantity}</span>
                  <button
                    onClick={() => changeQty(product.id, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-mist hover:bg-white/20"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="w-20 text-right text-sm text-mist/60">
                    {formatPrice(parseFloat(product.price) * quantity)}
                  </span>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="text-rose-300/60 hover:text-rose-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-sm font-semibold text-mist">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="input text-sm"
            >
              <option value="COD">Cash on Delivery</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
            </select>
          </div>
          {paymentMethod !== "COD" && (
            <Input
              label="Payment number"
              placeholder="03xx-xxxxxxx"
              value={paymentNumber}
              onChange={(e) => setPaymentNumber(e.target.value)}
              icon={<CreditCard size={15} />}
            />
          )}
        </div>

        {/* Rider assignment */}
        <div>
          <label className="label">Assign rider (optional)</label>
          <select
            value={riderId}
            onChange={(e) => setRiderId(e.target.value ? Number(e.target.value) : "")}
            className="input text-sm"
          >
            <option value="">— Assign later —</option>
            {deliveryBoys.data?.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name}{db.is_available ? "" : " (busy)"}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery notes */}
        <div>
          <label className="label">Delivery notes (optional)</label>
          <textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Special instructions…"
            rows={2}
            className="input w-full resize-none text-sm"
          />
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button onClick={submit} loading={saving} fullWidth>
            <ShoppingBag size={16} /> Create order
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
