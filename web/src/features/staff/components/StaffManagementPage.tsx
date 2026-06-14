"use client";

import { useState } from "react";
import {
  Users, CheckCircle2, Bike, Package,
  UserPlus, Plus, Search,
} from "lucide-react";
import type { StaffProfile, WorkingStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { useStaff } from "../hooks/useStaff";
import { AddStaffModal } from "./AddStaffModal";
import { StaffDetailModal } from "./StaffDetailModal";

// ─── Status badge ─────────────────────────────────────────────────────────────

function WorkingStatusDot({ status }: { status: WorkingStatus }) {
  const colour = {
    Active: "bg-emerald-400",
    Inactive: "bg-amber-400",
    Resigned: "bg-slate-400",
    Terminated: "bg-rose-400",
    "On Leave": "bg-sky-400",
  }[status] ?? "bg-mist/30";
  return <span className={cn("inline-block h-2 w-2 rounded-full", colour)} />;
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ staff }: { staff: StaffProfile[] }) {
  const total = staff.length;
  const active = staff.filter((s) => s.working_status === "Active").length;
  const riders = staff.filter((s) => s.is_rider).length;
  const totalDeliveries = staff.reduce((acc, s) => acc + (s.total_deliveries ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
          <Users size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Total Staff</p>
          <p className="text-lg font-bold text-mist">{total}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Active</p>
          <p className="text-lg font-bold text-mist">{active}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-wave/15 text-wave">
          <Bike size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Riders</p>
          <p className="text-lg font-bold text-mist">{riders}</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-300">
          <Package size={20} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-mist/50">Deliveries</p>
          <p className="text-lg font-bold text-mist">{totalDeliveries}</p>
        </div>
      </Card>
    </div>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({ member, onView }: { member: StaffProfile; onView: () => void }) {
  const deliveryRate =
    (member.total_deliveries ?? 0) > 0
      ? Math.round(((member.delivered_count ?? 0) / (member.total_deliveries ?? 1)) * 100)
      : 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-wave-gradient text-lg font-bold text-white shadow-glow overflow-hidden">
          {member.profile_picture_url
            ? <img src={member.profile_picture_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : member.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-mist">{member.full_name}</p>
          <p className="truncate text-xs text-mist/50">
            {member.designation || member.department || "@" + member.username}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <WorkingStatusDot status={member.working_status} />
            <span className="text-xs text-mist/60">{member.working_status}</span>
          </div>
          {!member.is_active && (
            <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              Inactive
            </span>
          )}
          {member.is_rider && (
            <span className="flex items-center gap-1 rounded-full bg-wave/15 px-2 py-0.5 text-[10px] font-semibold text-wave">
              <Bike size={10} /> Rider
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-mist/60">
        {member.employee_id && <span>ID: {member.employee_id}</span>}
        {member.phone_number && <span>{member.phone_number}</span>}
        {member.is_rider && (member.vehicle_type || member.vehicle_number) && (
          <span>{[member.vehicle_type, member.vehicle_number].filter(Boolean).join(" · ")}</span>
        )}
      </div>

      {/* Rider delivery stats */}
      {member.is_rider && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-mist/50">
            <span>{member.delivered_count ?? 0} / {member.total_deliveries ?? 0} delivered</span>
            <span className="font-medium text-mist/70">{deliveryRate}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div className="h-full rounded-full bg-wave transition-all" style={{ width: `${deliveryRate}%` }} />
          </div>
        </div>
      )}

      <Button variant="ghost" onClick={onView} fullWidth className="text-sm">
        View details
      </Button>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function StaffManagementPage() {
  const staffList = useStaff();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<StaffProfile | null>(null);

  const filtered = (staffList.data ?? []).filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.phone_number ?? "").includes(q) ||
      (s.employee_id ?? "").toLowerCase().includes(q) ||
      (s.department ?? "").toLowerCase().includes(q) ||
      (s.designation ?? "").toLowerCase().includes(q)
    );
  });

  const handleUpdated = (updated: StaffProfile) => {
    staffList.reload();
    setSelected(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={Users}
          title="Staff Management"
          subtitle="Manage team members, riders, and HR records"
        />
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Staff
        </Button>
      </div>

      {staffList.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : staffList.data && staffList.data.length > 0 ? (
        <SummaryCards staff={staffList.data} />
      ) : null}

      {!staffList.loading && (
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
          <input
            type="text"
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full py-2 pl-9 pr-3 text-sm"
          />
        </div>
      )}

      {staffList.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : staffList.error ? (
        <Card className="border-rose-400/30 p-6 text-center text-rose-200">{staffList.error}</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-mist/40">
          <UserPlus size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {staffList.data?.length === 0
              ? "No staff registered yet. Add your first team member."
              : "No staff match the search."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <StaffCard key={member.id} member={member} onView={() => setSelected(member)} />
          ))}
        </div>
      )}

      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => staffList.reload()}
      />

      <StaffDetailModal
        staff={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
