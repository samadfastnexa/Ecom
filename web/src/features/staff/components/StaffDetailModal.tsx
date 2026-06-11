"use client";

import { useState, useRef } from "react";
import {
  User, Mail, Phone, Truck, Hash, CreditCard, Calendar, Building2, Tag,
  DollarSign, AlertCircle, CheckCircle2, XCircle, Package, Check, X,
  Upload, FileText, Bike, MapPin,
} from "lucide-react";
import type { AdminOrder, StaffProfile, UpdateStaffPayload, WorkingStatus } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { staffApi } from "@/lib/api/staff";
import { Button, Input, Modal, Skeleton, useToast } from "@/components/ui";
import { useStaffHistory } from "../hooks/useStaff";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3 border-b border-white/10 py-2.5 last:border-0">
      <Icon size={15} className="mt-0.5 shrink-0 text-wave" />
      <div>
        <p className="text-xs text-mist/40">{label}</p>
        <p className="text-sm text-mist">{String(value)}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WorkingStatus }) {
  const colour = {
    Active: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    Inactive: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    Resigned: "bg-slate-400/15 text-slate-300 border-slate-400/30",
    Terminated: "bg-rose-400/15 text-rose-300 border-rose-400/30",
    "On Leave": "bg-sky-400/15 text-sky-300 border-sky-400/30",
  }[status] ?? "bg-white/10 text-mist/60 border-white/10";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", colour)}>
      {status}
    </span>
  );
}

// ─── History tab ───────────────────────────────────────────────────────────────

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
            <th className="px-3 py-2 font-medium">Status</th>
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
                  o.status === "Delivered" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-mist/60"
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

// ─── Documents tab ─────────────────────────────────────────────────────────────

function DocUpload({
  label,
  fieldKey,
  currentUrl,
  isRider,
  onUploaded,
}: {
  label: string;
  fieldKey: string;
  currentUrl: string | null;
  isRider?: boolean;
  onUploaded: (key: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!isRider && fieldKey === "driving_license") return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-mist">{label}</p>
        <Button variant="ghost" onClick={() => inputRef.current?.click()} className="text-xs py-1 px-3">
          <Upload size={13} /> Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploaded(fieldKey, file);
            e.target.value = "";
          }}
        />
      </div>
      {currentUrl ? (
        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-wave underline-offset-2 hover:underline">
          <FileText size={13} /> View document
        </a>
      ) : (
        <p className="text-xs text-mist/40">No document uploaded yet.</p>
      )}
    </div>
  );
}

function DocumentsTab({ staff, onUpdated }: { staff: StaffProfile; onUpdated: (s: StaffProfile) => void }) {
  const notify = useToast();
  const [uploading, setUploading] = useState<string | null>(null);

  const upload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const updated = await staffApi.uploadDocuments(staff.id, { [key]: file });
      notify("Document uploaded.");
      onUpdated(updated);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {uploading && <p className="text-xs text-wave animate-pulse">Uploading {uploading}…</p>}
      <DocUpload
        label="Profile Picture"
        fieldKey="profile_picture"
        currentUrl={staff.profile_picture_url}
        onUploaded={upload}
      />
      <DocUpload
        label="CNIC — Front"
        fieldKey="cnic_front"
        currentUrl={staff.cnic_front_url}
        onUploaded={upload}
      />
      <DocUpload
        label="CNIC — Back"
        fieldKey="cnic_back"
        currentUrl={staff.cnic_back_url}
        onUploaded={upload}
      />
      <DocUpload
        label="Driving License"
        fieldKey="driving_license"
        currentUrl={staff.driving_license_url}
        isRider={staff.is_rider}
        onUploaded={upload}
      />
    </div>
  );
}

// ─── Profile tab ───────────────────────────────────────────────────────────────

type EditForm = Omit<UpdateStaffPayload, "salary"> & { salary: string };

function ProfileTab({ staff, onUpdated }: { staff: StaffProfile; onUpdated: (s: StaffProfile) => void }) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EditForm>({ salary: "" });

  const startEdit = () => {
    setForm({
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      phone_number: staff.phone_number ?? "",
      address: staff.address ?? "",
      is_rider: staff.is_rider,
      is_available: staff.is_available,
      vehicle_type: staff.vehicle_type ?? "",
      vehicle_number: staff.vehicle_number ?? "",
      employee_id: staff.employee_id ?? "",
      cnic_number: staff.cnic_number ?? "",
      date_of_birth: staff.date_of_birth ?? "",
      date_of_joining: staff.date_of_joining ?? "",
      working_status: staff.working_status,
      emergency_contact: staff.emergency_contact ?? "",
      department: staff.department ?? "",
      designation: staff.designation ?? "",
      salary: staff.salary ?? "",
      remarks: staff.remarks ?? "",
    });
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: UpdateStaffPayload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number || null,
        address: form.address || null,
        is_rider: form.is_rider,
        is_available: form.is_available,
        vehicle_type: form.is_rider ? form.vehicle_type || null : null,
        vehicle_number: form.is_rider ? form.vehicle_number || null : null,
        employee_id: (form.employee_id as string) || null,
        cnic_number: (form.cnic_number as string) || null,
        date_of_birth: (form.date_of_birth as string) || null,
        date_of_joining: (form.date_of_joining as string) || null,
        working_status: form.working_status,
        emergency_contact: (form.emergency_contact as string) || null,
        department: (form.department as string) || null,
        designation: (form.designation as string) || null,
        salary: form.salary ? parseFloat(form.salary as string) : null,
        remarks: (form.remarks as string) || null,
      };
      const updated = await staffApi.update(staff.id, payload);
      notify("Profile updated.");
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof EditForm, value: string | boolean | null) =>
    setForm((p) => ({ ...p, [key]: value }));

  if (editing) {
    const isRider = form.is_rider ?? false;
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
          <Input label="Last name" value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input label="Email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        <Input label="Phone" value={(form.phone_number as string) ?? ""} onChange={(e) => set("phone_number", e.target.value)} icon={<Phone size={15} />} />
        <Input label="Emergency Contact" value={(form.emergency_contact as string) ?? ""} onChange={(e) => set("emergency_contact", e.target.value)} icon={<AlertCircle size={15} />} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Employee ID" value={(form.employee_id as string) ?? ""} onChange={(e) => set("employee_id", e.target.value)} icon={<Hash size={15} />} />
          <div>
            <label className="label">Working Status</label>
            <select
              value={form.working_status ?? "Active"}
              onChange={(e) => set("working_status", e.target.value)}
              className="input"
            >
              {["Active", "Inactive", "Resigned", "Terminated", "On Leave"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Department" value={(form.department as string) ?? ""} onChange={(e) => set("department", e.target.value)} icon={<Building2 size={15} />} />
          <Input label="Designation" value={(form.designation as string) ?? ""} onChange={(e) => set("designation", e.target.value)} icon={<Tag size={15} />} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date of Birth" type="date" value={(form.date_of_birth as string) ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} icon={<Calendar size={15} />} />
          <Input label="Date of Joining" type="date" value={(form.date_of_joining as string) ?? ""} onChange={(e) => set("date_of_joining", e.target.value)} icon={<Calendar size={15} />} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="CNIC Number" value={(form.cnic_number as string) ?? ""} onChange={(e) => set("cnic_number", e.target.value)} icon={<CreditCard size={15} />} />
          <Input label="Salary" type="number" min={0} step="0.01" value={(form.salary as string) ?? ""} onChange={(e) => set("salary", e.target.value)} icon={<DollarSign size={15} />} />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea
            value={(form.address as string) ?? ""}
            onChange={(e) => set("address", e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </div>

        {/* Is Rider toggle */}
        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <input
            type="checkbox"
            checked={isRider}
            onChange={(e) => set("is_rider", e.target.checked)}
            className="h-4 w-4 accent-wave"
          />
          <div>
            <p className="text-sm font-medium text-mist">Is Rider</p>
            <p className="text-xs text-mist/50">Can be assigned to delivery orders</p>
          </div>
        </label>

        {isRider && (
          <div className="flex flex-col gap-3 pl-2 border-l-2 border-wave/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_available ?? true}
                onChange={(e) => set("is_available", e.target.checked)}
                className="h-4 w-4 accent-wave"
              />
              <span className="text-sm text-mist">Available for deliveries</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Vehicle type" value={(form.vehicle_type as string) ?? ""} onChange={(e) => set("vehicle_type", e.target.value)} icon={<Truck size={15} />} />
              <Input label="Vehicle number" value={(form.vehicle_number as string) ?? ""} onChange={(e) => set("vehicle_number", e.target.value)} icon={<Hash size={15} />} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Remarks</label>
          <textarea
            value={(form.remarks as string) ?? ""}
            onChange={(e) => set("remarks", e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-3">
          <Button onClick={save} loading={saving} fullWidth><Check size={15} /> Save</Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} fullWidth><X size={15} /> Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <InfoRow icon={User} label="Username" value={staff.username} />
      <InfoRow icon={Mail} label="Email" value={staff.email} />
      <InfoRow icon={Hash} label="Employee ID" value={staff.employee_id} />
      <InfoRow icon={Phone} label="Phone" value={staff.phone_number} />
      <InfoRow icon={AlertCircle} label="Emergency Contact" value={staff.emergency_contact} />
      <InfoRow icon={MapPin} label="Address" value={staff.address} />
      <InfoRow icon={CreditCard} label="CNIC Number" value={staff.cnic_number} />
      <InfoRow icon={Calendar} label="Date of Birth" value={
        staff.date_of_birth
          ? `${new Date(staff.date_of_birth).toLocaleDateString()} (${staff.age} yrs)`
          : null
      } />
      <InfoRow icon={Calendar} label="Date of Joining" value={staff.date_of_joining ? new Date(staff.date_of_joining).toLocaleDateString() : null} />
      <InfoRow icon={Building2} label="Department" value={staff.department} />
      <InfoRow icon={Tag} label="Designation" value={staff.designation} />
      <InfoRow icon={DollarSign} label="Salary" value={staff.salary ? formatPrice(staff.salary) : null} />
      {staff.is_rider && (
        <>
          <InfoRow icon={Truck} label="Vehicle Type" value={staff.vehicle_type} />
          <InfoRow icon={Hash} label="Vehicle Number" value={staff.vehicle_number} />
          <div className="flex gap-3 border-b border-white/10 py-2.5">
            {staff.is_available
              ? <><CheckCircle2 size={15} className="mt-0.5 text-emerald-400" /><p className="text-sm text-emerald-300">Available for deliveries</p></>
              : <><XCircle size={15} className="mt-0.5 text-rose-400" /><p className="text-sm text-rose-300">Not available</p></>}
          </div>
        </>
      )}
      {staff.remarks && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-mist/70 mt-2">
          {staff.remarks}
        </div>
      )}
      <Button variant="ghost" onClick={startEdit} fullWidth className="mt-3 text-sm">Edit profile</Button>
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

type Tab = "profile" | "documents" | "history";

interface StaffDetailModalProps {
  staff: StaffProfile | null;
  onClose: () => void;
  onUpdated: (staff: StaffProfile) => void;
}

export function StaffDetailModal({ staff, onClose, onUpdated }: StaffDetailModalProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const history = useStaffHistory(tab === "history" ? (staff?.id ?? null) : null);

  if (!staff) return null;

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "profile", label: "Profile", show: true },
    { key: "documents", label: "Documents", show: true },
    { key: "history", label: "Deliveries", show: staff.is_rider },
  ];

  const deliveryRate = (staff.total_deliveries ?? 0) > 0
    ? Math.round(((staff.delivered_count ?? 0) / (staff.total_deliveries ?? 1)) * 100)
    : 0;

  return (
    <Modal open={!!staff} onClose={onClose} title="Staff Member" className="max-w-xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4 rounded-xl bg-wave-gradient p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
          {staff.profile_picture_url
            ? <img src={staff.profile_picture_url} alt="" className="h-full w-full rounded-2xl object-cover" />
            : staff.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{staff.full_name}</h3>
          <p className="text-sm text-white/70">
            {staff.designation || staff.department || "@" + staff.username}
          </p>
          {staff.employee_id && (
            <p className="text-xs text-white/50">ID: {staff.employee_id}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={staff.working_status} />
          {staff.is_rider && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white">
              <Bike size={11} /> Rider
            </span>
          )}
        </div>
      </div>

      {/* Rider stats if applicable */}
      {staff.is_rider && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-mist/60">
            <Package size={14} className="text-wave" />
            {staff.total_deliveries ?? 0} assigned
          </span>
          <span className="flex items-center gap-2 text-mist/60">
            <CheckCircle2 size={14} className="text-emerald-400" />
            {staff.delivered_count ?? 0} delivered ({deliveryRate}%)
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              tab === t.key ? "bg-wave/20 text-wave" : "text-mist/60 hover:text-mist"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {tab === "profile" && <ProfileTab staff={staff} onUpdated={onUpdated} />}
        {tab === "documents" && <DocumentsTab staff={staff} onUpdated={onUpdated} />}
        {tab === "history" && <HistoryTable orders={history.data} loading={history.loading} />}
      </div>
    </Modal>
  );
}
