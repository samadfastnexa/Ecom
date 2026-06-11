"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Truck, Hash,
  CheckCircle2, XCircle, Package, Wallet, Clock, Check, X,
} from "lucide-react";
import type { AdminOrder, RiderProfile, UpdateRiderPayload } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ridersApi } from "@/lib/api/riders";
import { Button, Input, Modal, Skeleton, useToast } from "@/components/ui";
import { useRiderHistory } from "../hooks/useRiders";

// ─── History table ─────────────────────────────────────────────────────────────

function HistoryTable({ orders, loading }: { orders: AdminOrder[] | null; loading: boolean }) {
  if (loading) return <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (!orders || orders.length === 0)
    return <p className="py-6 text-center text-sm text-mist/40">No delivery history yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-mist/40">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Total</th>
            <th className="px-3 py-2 font-medium">Delivery</th>
            <th className="px-3 py-2 text-center font-medium">Cash</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-3 py-2 text-mist/50">#{o.id}</td>
              <td className="px-3 py-2 text-mist">{o.customer_name}</td>
              <td className="px-3 py-2 text-mist/60">
                {new Date(o.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </td>
              <td className="px-3 py-2 font-medium text-mist">{formatPrice(o.total_price)}</td>
              <td className="px-3 py-2">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  o.delivery_status === "Delivered" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-mist/60"
                )}>
                  {o.delivery_status || o.status}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                {o.cash_received
                  ? <span className="text-emerald-300"><Check size={14} /></span>
                  : <span className="text-mist/30"><X size={14} /></span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Profile edit section ──────────────────────────────────────────────────────

function ProfileInfo({ rider, onUpdated }: { rider: RiderProfile; onUpdated: (r: RiderProfile) => void }) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<UpdateRiderPayload>({});

  const startEdit = () => {
    setForm({
      first_name: rider.first_name,
      last_name: rider.last_name,
      email: rider.email,
      phone_number: rider.phone_number ?? "",
      vehicle_type: rider.vehicle_type ?? "",
      vehicle_number: rider.vehicle_number ?? "",
      is_available: rider.is_available,
    });
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await ridersApi.update(rider.id, {
        ...form,
        phone_number: form.phone_number || null,
        vehicle_type: form.vehicle_type || null,
        vehicle_number: form.vehicle_number || null,
      });
      notify("Profile updated.");
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof UpdateRiderPayload, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
          <Input label="Last name" value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input label="Email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        <Input label="Phone" value={form.phone_number ?? ""} onChange={(e) => set("phone_number", e.target.value)} icon={<Phone size={15} />} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Vehicle type" value={form.vehicle_type ?? ""} onChange={(e) => set("vehicle_type", e.target.value)} icon={<Truck size={15} />} />
          <Input label="Vehicle number" value={form.vehicle_number ?? ""} onChange={(e) => set("vehicle_number", e.target.value)} icon={<Hash size={15} />} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_available ?? true}
            onChange={(e) => set("is_available", e.target.checked)}
            className="h-4 w-4 accent-wave"
          />
          <span className="text-sm text-mist">Available for deliveries</span>
        </label>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-3">
          <Button onClick={save} loading={saving} fullWidth><Check size={15} /> Save</Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} fullWidth><X size={15} /> Cancel</Button>
        </div>
      </div>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) =>
    value ? (
      <div className="flex gap-3 border-b border-white/10 py-2.5 last:border-0">
        <Icon size={15} className="mt-0.5 shrink-0 text-wave" />
        <div>
          <p className="text-xs text-mist/40">{label}</p>
          <p className="text-sm text-mist">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-0.5">
      <InfoRow icon={User} label="Username" value={rider.username} />
      <InfoRow icon={Mail} label="Email" value={rider.email} />
      <InfoRow icon={Phone} label="Phone" value={rider.phone_number} />
      <InfoRow icon={Truck} label="Vehicle" value={rider.vehicle_type} />
      <InfoRow icon={Hash} label="Vehicle number" value={rider.vehicle_number} />
      <div className="flex gap-3 border-b border-white/10 py-2.5 last:border-0">
        {rider.is_available
          ? <><CheckCircle2 size={15} className="mt-0.5 text-emerald-400" /><p className="text-sm text-emerald-300">Available</p></>
          : <><XCircle size={15} className="mt-0.5 text-rose-400" /><p className="text-sm text-rose-300">Not available</p></>}
      </div>
      <Button variant="ghost" onClick={startEdit} fullWidth className="mt-3 text-sm">Edit profile</Button>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

type Tab = "profile" | "history";

interface RiderDetailModalProps {
  rider: RiderProfile | null;
  onClose: () => void;
  onUpdated: (rider: RiderProfile) => void;
}

export function RiderDetailModal({ rider, onClose, onUpdated }: RiderDetailModalProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const history = useRiderHistory(tab === "history" ? (rider?.id ?? null) : null);

  if (!rider) return null;

  const riderTotal = rider.total_deliveries ?? 0;
  const riderDelivered = rider.delivered_count ?? 0;
  const deliveryRate = riderTotal > 0 ? Math.round((riderDelivered / riderTotal) * 100) : 0;

  return (
    <Modal open={!!rider} onClose={onClose} title="Delivery Boy" className="max-w-xl">
      {/* Avatar + stats header */}
      <div className="mb-4 flex items-center gap-4 rounded-xl bg-wave-gradient p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
          {rider.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-white">{rider.full_name}</h3>
          <p className="text-sm text-white/70">@{rider.username}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-white">
          <div className="flex items-center gap-1.5 text-sm">
            <Package size={14} className="opacity-70" />
            <span>{riderTotal} assigned</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 size={14} className="opacity-70" />
            <span>{riderDelivered} delivered ({deliveryRate}%)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {(["profile", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition",
              tab === t ? "bg-wave/20 text-wave" : "text-mist/60 hover:text-mist"
            )}
          >
            {t === "profile" ? "Profile" : "Delivery History"}
          </button>
        ))}
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {tab === "profile" ? (
          <ProfileInfo rider={rider} onUpdated={onUpdated} />
        ) : (
          <HistoryTable orders={history.data} loading={history.loading} />
        )}
      </div>
    </Modal>
  );
}
