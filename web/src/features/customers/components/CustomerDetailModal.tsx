"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Calendar, Package, Droplets, TrendingUp, Wallet, ShieldCheck, ShieldOff, BookOpen, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AddressFields,
  EMPTY_ADDRESS,
  composeAddress,
  hasAddressInput,
  splitAddress,
  validateAddress,
  type AddressErrors,
  type AddressParts,
} from "@/components/ui";
import { customersApi } from "@/lib/api";
import { balanceReminderMessage, canWhatsApp, openWhatsApp } from "@/lib/whatsapp";
import type { AdminCustomer, CustomerOrderStats } from "@/lib/types";

interface Props {
  customer: AdminCustomer | null;
  onClose: () => void;
  onUpdated: () => void;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 p-4 text-center">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icon size={18} />
      </span>
      <p className="text-lg font-bold text-mist">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-mist/40">{label}</p>
    </div>
  );
}

export function CustomerDetailModal({ customer, onClose, onUpdated }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<CustomerOrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressParts>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setPhone(customer.phone ?? "");
    // Prefer the stored parts. Records created before the split have none, so
    // fall back to picking the old one-line address apart — otherwise editing
    // a legacy customer would silently blank their address.
    setAddress(
      customer.house_number || customer.area || customer.block || customer.portion
        ? {
            house_number: customer.house_number ?? "",
            portion: customer.portion ?? "",
            block: customer.block ?? "",
            area: customer.area ?? "",
          }
        : splitAddress(customer.address),
    );
    setAddressErrors({});
    setSaveError("");
    setStatsLoading(true);
    customersApi.stats(customer.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [customer]);

  if (!customer) return null;

  // Compare on the composed line: that is what the server stores, so an edit
  // that only reshuffles the parts into the same address is genuinely no change.
  const changed =
    phone !== (customer.phone ?? "") ||
    composeAddress(address) !== (customer.address ?? "");

  const save = async () => {
    // An address is optional, but a half-filled one is not — without a house
    // number and an area a rider has nowhere to go.
    const wantsAddress = hasAddressInput(address);
    const issues = wantsAddress ? validateAddress(address) : {};
    setAddressErrors(issues);
    if (Object.keys(issues).length > 0) {
      setSaveError("Complete the address, or clear every part of it.");
      return;
    }

    setSaveError("");
    setSaving(true);
    try {
      // Only the parts go up; the server recomposes `address` from them.
      await customersApi.update(customer.id, {
        phone_number: phone.trim() || null,
        house_number: wantsAddress ? address.house_number.trim() : "",
        portion: wantsAddress ? address.portion.trim() : "",
        block: wantsAddress ? address.block.trim() : "",
        area: wantsAddress ? address.area.trim() : "",
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setToggling(true);
    try {
      await customersApi.update(customer.id, { is_active: !customer.is_active });
      onUpdated();
    } catch {
      // leave modal open so user sees nothing happened
    } finally {
      setToggling(false);
    }
  };

  const initials = customer.name.charAt(0).toUpperCase();

  const balanceNum = stats?.account_balance ?? null;
  const balanceColor =
    balanceNum === null ? "text-mist/50" :
    balanceNum < 0 ? "text-rose-300" :
    balanceNum > 0 ? "text-emerald-300" :
    "text-mist/50";

  const lastDate = stats?.last_order_date
    ? new Date(stats.last_order_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const joinedDate = new Date(customer.date_joined).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Modal open={!!customer} onClose={onClose} title="Customer Details" className="max-w-3xl">
      {/* Header */}
      <div className="mb-5 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-wave-gradient text-2xl font-bold text-white shadow-glow">
          {initials}
        </span>
        <div>
          <p className="text-lg font-bold text-mist">{customer.name}</p>
          <p className="text-sm text-mist/50">@{customer.username}</p>
          {customer.email && <p className="text-xs text-mist/40">{customer.email}</p>}
        </div>
      </div>

      {/* Joined date + account status */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-mist/40">
          <Calendar size={13} />
          Joined {joinedDate}
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            customer.is_active
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-rose-400/15 text-rose-300"
          }`}>
            {customer.is_active ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
            {customer.is_active ? "Active" : "Inactive"}
          </span>
          <button
            onClick={toggleActive}
            disabled={toggling}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              customer.is_active
                ? "border border-rose-400/30 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20"
                : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
            }`}
          >
            {toggling ? "Saving…" : customer.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Editable contact fields */}
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-mist/50">
            <Phone size={11} /> Phone
          </label>
          <input
            className="input w-full text-sm"
            placeholder="03xx-xxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <AddressFields
          value={address}
          onChange={setAddress}
          errors={addressErrors}
          required={false}
        />
      </div>

      {saveError && (
        <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{saveError}</p>
      )}

      {changed && (
        <Button onClick={save} loading={saving} fullWidth className="mb-5">
          Save Changes
        </Button>
      )}

      {/* Divider */}
      <div className="mb-4 h-px bg-white/10" />

      {/* Order stats */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-mist/40">Order Stats</p>
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Package} label="Total Orders" value={stats.total_orders} color="bg-sky-400/15 text-sky-300" />
          <StatCard icon={TrendingUp} label="Delivered" value={stats.delivered_count} color="bg-emerald-400/15 text-emerald-300" />
          <StatCard icon={Droplets} label="Bottles" value={stats.total_bottles} color="bg-wave/15 text-wave" />
          <StatCard icon={Calendar} label="Last Order" value={lastDate} color="bg-indigo-400/15 text-indigo-300" />
          <div className="col-span-2 flex flex-col items-center gap-1 rounded-xl bg-white/5 p-4 text-center">
            <Wallet size={18} className={balanceColor} />
            <p className={`text-lg font-bold ${balanceColor}`}>
              {balanceNum === null
                ? "—"
                : `${balanceNum >= 0 ? "+" : ""}PKR ${Math.abs(balanceNum).toLocaleString()}`}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-mist/40">
              {balanceNum === null ? "Balance" : balanceNum < 0 ? "Owes" : "Credit"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-mist/30">No order data available.</p>
      )}

      {/* Ledger + WhatsApp */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="ghost"
          fullWidth
          onClick={() => router.push(`/manage/ledger?customer=${customer.id}`)}
        >
          <BookOpen size={15} /> View ledger
        </Button>
        {canWhatsApp(customer.phone) && (
          <Button
            variant="ghost"
            fullWidth
            onClick={() => openWhatsApp(customer.phone, balanceReminderMessage({
              customerName: customer.name || customer.username,
              // stats.account_balance is credit-positive; the reminder wants owed.
              balance: balanceNum === null ? 0 : -balanceNum,
            }))}
          >
            <MessageCircle size={15} /> WhatsApp
          </Button>
        )}
      </div>
    </Modal>
  );
}
