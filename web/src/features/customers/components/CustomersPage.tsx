"use client";

import { useState } from "react";
import { Users, UserPlus, Search, Phone, MapPin, Package } from "lucide-react";
import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AdminCustomer } from "@/lib/types";
import { useCustomers } from "../hooks/useCustomers";
import { AddCustomerModal } from "./AddCustomerModal";
import { CustomerDetailModal } from "./CustomerDetailModal";

type ActiveFilter = "all" | "thisMonth" | "withPhone" | "withAddress";

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  customers: AdminCustomer[];
  activeFilter: ActiveFilter;
  onFilter: (f: ActiveFilter) => void;
}

function SummaryCards({ customers, activeFilter, onFilter }: SummaryCardsProps) {
  const total = customers.length;
  const withPhone = customers.filter((c) => c.phone).length;
  const withAddress = customers.filter((c) => c.address).length;
  const thisMonth = customers.filter((c) => {
    const d = new Date(c.date_joined);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filterCard = (
    filter: ActiveFilter,
    icon: React.ReactNode,
    label: string,
    value: number,
    iconCls: string,
    activeBorderCls: string,
  ) => {
    const active = activeFilter === filter;
    return (
      <button
        type="button"
        onClick={() => onFilter(active ? "all" : filter)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all",
          "hover:bg-white/10",
          active
            ? cn("bg-white/10", activeBorderCls)
            : "border-white/10 bg-white/5 hover:border-white/20",
        )}
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconCls)}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-mist/50">{label}</p>
          <p className="text-lg font-bold text-mist">{value}</p>
        </div>
        {active && (
          <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-mist/40">
            active
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {filterCard("all", <Users size={20} />, "Total", total, "bg-wave/15 text-wave", "border-wave/50")}
      {filterCard("thisMonth", <UserPlus size={20} />, "This Month", thisMonth, "bg-emerald-400/15 text-emerald-300", "border-emerald-400/50")}
      {filterCard("withPhone", <Phone size={20} />, "With Phone", withPhone, "bg-sky-400/15 text-sky-300", "border-sky-400/50")}
      {filterCard("withAddress", <MapPin size={20} />, "With Address", withAddress, "bg-indigo-400/15 text-indigo-300", "border-indigo-400/50")}
    </div>
  );
}

// ─── Customer row ─────────────────────────────────────────────────────────────

function CustomerRow({ customer, onView }: { customer: AdminCustomer; onView: () => void }) {
  const initials = customer.name.charAt(0).toUpperCase();
  const joined = new Date(customer.date_joined).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <tr
      className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
      onClick={onView}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-glow",
            customer.is_active ? "bg-wave-gradient" : "bg-white/20",
          )}>
            {initials}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className={cn("font-semibold", customer.is_active ? "text-mist" : "text-mist/40 line-through")}>{customer.name}</p>
              {!customer.is_active && (
                <span className="rounded-full bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">Inactive</span>
              )}
            </div>
            <p className="text-xs text-mist/40">@{customer.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-mist/60">{customer.email || "—"}</td>
      <td className="px-4 py-3 text-sm text-mist/60">{customer.phone || "—"}</td>
      <td className="hidden px-4 py-3 text-sm text-mist/60 lg:table-cell">
        {customer.address
          ? <span className="line-clamp-1 max-w-xs">{customer.address}</span>
          : "—"}
      </td>
      <td className="hidden px-4 py-3 text-xs text-mist/40 sm:table-cell">{joined}</td>
      <td className="px-4 py-3 text-right">
        <button className="rounded-lg px-3 py-1 text-xs font-medium text-wave transition hover:bg-wave/10">
          View
        </button>
      </td>
    </tr>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function CustomersPage() {
  const customersList = useCustomers();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<AdminCustomer | null>(null);

  const now = new Date();

  const filtered = (customersList.data ?? []).filter((c) => {
    // Card filter
    if (activeFilter === "thisMonth") {
      const d = new Date(c.date_joined);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    } else if (activeFilter === "withPhone") {
      if (!c.phone) return false;
    } else if (activeFilter === "withAddress") {
      if (!c.address) return false;
    }

    // Search filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.address ?? "").toLowerCase().includes(q)
    );
  });

  const filterLabel: Record<ActiveFilter, string> = {
    all: "all customers",
    thisMonth: "joined this month",
    withPhone: "with phone number",
    withAddress: "with address",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={Users}
          title="Customers"
          subtitle="All registered customer accounts"
        />
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus size={16} /> Add Customer
        </Button>
      </div>

      {/* Summary cards */}
      {customersList.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : customersList.data && customersList.data.length > 0 ? (
        <SummaryCards
          customers={customersList.data}
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
        />
      ) : null}

      {/* Search + active filter label */}
      {!customersList.loading && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
            <input
              type="text"
              placeholder="Search by name, phone, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="flex items-center gap-1.5 rounded-lg border border-wave/30 bg-wave/10 px-3 py-2 text-xs font-medium text-wave transition hover:bg-wave/20"
            >
              Showing: {filterLabel[activeFilter]} &times;
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {customersList.loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : customersList.error ? (
        <Card className="border-rose-400/30 p-6 text-center text-rose-200">{customersList.error}</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-mist/40">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {customersList.data?.length === 0
              ? "No customers registered yet."
              : "No customers match the current filter."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-mist/40">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-mist/40">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-mist/40">Phone</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-mist/40 lg:table-cell">Address</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-mist/40 sm:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CustomerRow key={c.id} customer={c} onView={() => setSelected(c)} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/5 px-4 py-2 text-xs text-mist/30">
            {filtered.length} of {customersList.data?.length ?? 0} customers
          </p>
        </Card>
      )}

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => customersList.reload()}
      />

      <CustomerDetailModal
        customer={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { setSelected(null); customersList.reload(); }}
      />
    </div>
  );
}
