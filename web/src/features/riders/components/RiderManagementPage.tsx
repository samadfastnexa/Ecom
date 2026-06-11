"use client";

import { useState } from "react";
import {
  Bike,
  CheckCircle2,
  XCircle,
  Package,
  UserPlus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type { RiderProfile } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { useRiders } from "../hooks/useRiders";
import { AddRiderModal } from "./AddRiderModal";
import { RiderDetailModal } from "./RiderDetailModal";

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ riders }: { riders: RiderProfile[] }) {
  const total = riders.length;
  const available = riders.filter((r) => r.is_available).length;
  const totalDeliveries = riders.reduce((s, r) => s + (r.total_deliveries ?? 0), 0);
  const totalDelivered = riders.reduce((s, r) => s + (r.delivered_count ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
          <Users size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Total</p>
          <p className="text-lg font-bold text-mist">{total}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Available</p>
          <p className="text-lg font-bold text-mist">{available}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-wave/15 text-wave">
          <Package size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Assigned</p>
          <p className="text-lg font-bold text-mist">{totalDeliveries}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-300">
          <Bike size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Delivered</p>
          <p className="text-lg font-bold text-mist">{totalDelivered}</p>
        </div>
      </Card>
    </div>
  );
}

// ─── Rider card ────────────────────────────────────────────────────────────────

function RiderCard({
  rider,
  onView,
}: {
  rider: RiderProfile;
  onView: () => void;
}) {
  const total = rider.total_deliveries ?? 0;
  const delivered = rider.delivered_count ?? 0;
  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-wave-gradient text-lg font-bold text-white shadow-glow">
          {rider.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-mist">{rider.full_name}</p>
          <p className="truncate text-xs text-mist/50">@{rider.username}</p>
        </div>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            rider.is_available
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-rose-400/15 text-rose-300"
          )}
          title={rider.is_available ? "Available" : "Not available"}
        >
          {rider.is_available ? (
            <CheckCircle2 size={15} />
          ) : (
            <XCircle size={15} />
          )}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-xs text-mist/60">
        {rider.phone_number && (
          <span>{rider.phone_number}</span>
        )}
        {(rider.vehicle_type || rider.vehicle_number) && (
          <span>
            {[rider.vehicle_type, rider.vehicle_number].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      {/* Delivery stats bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-mist/50">
          <span>{delivered} / {total} delivered</span>
          <span className="font-medium text-mist/70">{rate}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-wave transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      <Button variant="ghost" onClick={onView} fullWidth className="text-sm">
        View details
      </Button>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RiderManagementPage() {
  const riders = useRiders();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<RiderProfile | null>(null);

  const filtered = (riders.data ?? []).filter((r) => {
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      (r.phone_number ?? "").includes(q) ||
      (r.vehicle_type ?? "").toLowerCase().includes(q)
    );
  });

  const handleUpdated = (updated: RiderProfile) => {
    riders.reload();
    setSelected(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={Bike}
          title="Delivery Boys"
          subtitle="Manage riders, view delivery history and profiles"
        />
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Rider
        </Button>
      </div>

      {/* Summary */}
      {riders.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : riders.data && riders.data.length > 0 ? (
        <SummaryCards riders={riders.data} />
      ) : null}

      {/* Search */}
      {!riders.loading && (
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
          <input
            type="text"
            placeholder="Search by name, phone, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full py-2 pl-9 pr-3 text-sm"
          />
        </div>
      )}

      {/* Grid */}
      {riders.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : riders.error ? (
        <Card className="border-rose-400/30 p-6 text-center text-rose-200">{riders.error}</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-mist/40">
          <UserPlus size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {riders.data?.length === 0
              ? "No delivery boys registered yet. Add your first rider."
              : "No riders match the search."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rider) => (
            <RiderCard key={rider.id} rider={rider} onView={() => setSelected(rider)} />
          ))}
        </div>
      )}

      <AddRiderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => riders.reload()}
      />

      <RiderDetailModal
        rider={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
