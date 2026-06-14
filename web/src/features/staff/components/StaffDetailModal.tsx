"use client";

import { useState, useRef } from "react";
import {
  User, Mail, Phone, Truck, Hash, CreditCard, Calendar, Building2, Tag,
  DollarSign, AlertCircle, CheckCircle2, XCircle, Package, Check, X,
  Upload, FileText, Bike, MapPin, ShieldCheck, ShieldOff,
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
    <div className="flex gap-2.5 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-wave" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-mist/40">{label}</p>
        <p className="truncate text-sm text-mist">{String(value)}</p>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-mist/40">
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Customer</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Total</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 text-center font-medium">Cash</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-3 py-2.5 text-mist/50">#{o.id}</td>
              <td className="px-3 py-2.5 text-mist">{o.customer_name}</td>
              <td className="px-3 py-2.5 text-mist/60">
                {new Date(o.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </td>
              <td className="px-3 py-2.5 font-medium text-mist">{formatPrice(o.total_price)}</td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  o.status === "Delivered" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-mist/60"
                )}>
                  {o.delivery_status || o.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-center">
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
  uploading,
  onUploaded,
}: {
  label: string;
  fieldKey: string;
  currentUrl: string | null;
  isRider?: boolean;
  uploading: string | null;
  onUploaded: (key: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!isRider && fieldKey === "driving_license") return null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <FileText size={15} className="text-wave shrink-0" />
        <div>
          <p className="text-sm font-medium text-mist">{label}</p>
          {currentUrl ? (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-wave underline-offset-2 hover:underline">
              View document
            </a>
          ) : (
            <p className="text-xs text-mist/40">Not uploaded</p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        className="text-xs py-1 px-3 shrink-0"
        loading={uploading === fieldKey}
      >
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
    <div className="flex flex-col gap-2.5">
      <DocUpload label="Profile Picture" fieldKey="profile_picture" currentUrl={staff.profile_picture_url} uploading={uploading} onUploaded={upload} />
      <DocUpload label="CNIC — Front" fieldKey="cnic_front" currentUrl={staff.cnic_front_url} uploading={uploading} onUploaded={upload} />
      <DocUpload label="CNIC — Back" fieldKey="cnic_back" currentUrl={staff.cnic_back_url} uploading={uploading} onUploaded={upload} />
      <DocUpload label="Driving License" fieldKey="driving_license" currentUrl={staff.driving_license_url} isRider={staff.is_rider} uploading={uploading} onUploaded={upload} />
    </div>
  );
}

// ─── Profile tab ───────────────────────────────────────────────────────────────

type EditForm = Omit<UpdateStaffPayload, "salary"> & { salary: string; is_active: boolean; username: string };

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  activeColor = "accent-wave",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
  activeColor?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cn("h-4 w-4", activeColor)}
      />
      <div>
        <p className="text-sm font-medium text-mist">{title}</p>
        <p className="text-xs text-mist/50">{description}</p>
      </div>
    </label>
  );
}

function ProfileTab({ staff, onUpdated }: { staff: StaffProfile; onUpdated: (s: StaffProfile) => void }) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EditForm>({ salary: "", is_active: true, username: "" });

  const startEdit = () => {
    setForm({
      username: staff.username,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      is_active: staff.is_active,
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
        username: form.username || undefined,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        is_active: form.is_active,
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
      <div className="flex flex-col gap-4">
        {/* Personal */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">Personal</p>
          <div className="mb-3">
            <Input label="Username" value={form.username} onChange={(e) => set("username", e.target.value)} icon={<User size={15} />} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
            <Input label="Last name" value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
            <Input label="Email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            <Input label="Phone" value={(form.phone_number as string) ?? ""} onChange={(e) => set("phone_number", e.target.value)} icon={<Phone size={15} />} />
            <Input label="Emergency Contact" value={(form.emergency_contact as string) ?? ""} onChange={(e) => set("emergency_contact", e.target.value)} icon={<AlertCircle size={15} />} />
            <Input label="Date of Birth" type="date" value={(form.date_of_birth as string) ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} icon={<Calendar size={15} />} />
          </div>
          <div className="mt-3">
            <label className="label">Address</label>
            <textarea value={(form.address as string) ?? ""} onChange={(e) => set("address", e.target.value)} rows={2} className="input resize-none" />
          </div>
        </section>

        {/* HR */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">HR / Employment</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID" value={(form.employee_id as string) ?? ""} onChange={(e) => set("employee_id", e.target.value)} icon={<Hash size={15} />} />
            <Input label="CNIC Number" value={(form.cnic_number as string) ?? ""} onChange={(e) => set("cnic_number", e.target.value)} icon={<CreditCard size={15} />} />
            <Input label="Department" value={(form.department as string) ?? ""} onChange={(e) => set("department", e.target.value)} icon={<Building2 size={15} />} />
            <Input label="Designation" value={(form.designation as string) ?? ""} onChange={(e) => set("designation", e.target.value)} icon={<Tag size={15} />} />
            <Input label="Date of Joining" type="date" value={(form.date_of_joining as string) ?? ""} onChange={(e) => set("date_of_joining", e.target.value)} icon={<Calendar size={15} />} />
            <Input label="Salary" type="number" min={0} step="0.01" value={(form.salary as string) ?? ""} onChange={(e) => set("salary", e.target.value)} icon={<DollarSign size={15} />} />
            <div className="col-span-2">
              <label className="label">Working Status</label>
              <select value={form.working_status ?? "Active"} onChange={(e) => set("working_status", e.target.value)} className="input">
                {["Active", "Inactive", "Resigned", "Terminated", "On Leave"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Remarks</label>
            <textarea value={(form.remarks as string) ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} className="input resize-none" />
          </div>
        </section>

        {/* Toggles */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">Access &amp; Role</p>
          <div className="flex flex-col gap-2">
            <ToggleRow
              checked={form.is_active ?? true}
              onChange={(v) => set("is_active", v)}
              title="Account Active"
              description="Uncheck to block this staff member from logging in"
            />
            <ToggleRow
              checked={isRider}
              onChange={(v) => set("is_rider", v)}
              title="Is Rider"
              description="Can be assigned to delivery orders"
            />
            {isRider && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-wave/20 bg-wave/5 p-3">
                <ToggleRow
                  checked={form.is_available ?? true}
                  onChange={(v) => set("is_available", v)}
                  title="Available for deliveries"
                  description="Rider will appear in the assignment dropdown"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Vehicle type" value={(form.vehicle_type as string) ?? ""} onChange={(e) => set("vehicle_type", e.target.value)} icon={<Truck size={15} />} />
                  <Input label="Vehicle number" value={(form.vehicle_number as string) ?? ""} onChange={(e) => set("vehicle_number", e.target.value)} icon={<Hash size={15} />} />
                </div>
              </div>
            )}
          </div>
        </section>

        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button onClick={save} loading={saving} fullWidth><Check size={15} /> Save changes</Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} fullWidth><X size={15} /> Cancel</Button>
        </div>
      </div>
    );
  }

  // ── View mode ──
  return (
    <div className="flex flex-col gap-4">
      {/* Personal */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">Personal</p>
        <div className="grid grid-cols-2 gap-2">
          <InfoRow icon={User} label="Username" value={staff.username} />
          <InfoRow icon={Mail} label="Email" value={staff.email} />
          <InfoRow icon={Phone} label="Phone" value={staff.phone_number} />
          <InfoRow icon={AlertCircle} label="Emergency" value={staff.emergency_contact} />
          <InfoRow icon={MapPin} label="Address" value={staff.address} />
          <InfoRow icon={Calendar} label="Date of Birth" value={
            staff.date_of_birth
              ? `${new Date(staff.date_of_birth).toLocaleDateString()} (${staff.age} yrs)`
              : null
          } />
        </div>
      </section>

      {/* HR */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">HR / Employment</p>
        <div className="grid grid-cols-2 gap-2">
          <InfoRow icon={Hash} label="Employee ID" value={staff.employee_id} />
          <InfoRow icon={CreditCard} label="CNIC" value={staff.cnic_number} />
          <InfoRow icon={Building2} label="Department" value={staff.department} />
          <InfoRow icon={Tag} label="Designation" value={staff.designation} />
          <InfoRow icon={Calendar} label="Date of Joining" value={staff.date_of_joining ? new Date(staff.date_of_joining).toLocaleDateString() : null} />
          <InfoRow icon={DollarSign} label="Salary" value={staff.salary ? formatPrice(staff.salary) : null} />
        </div>
      </section>

      {/* Rider section */}
      {staff.is_rider && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">Rider</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoRow icon={Truck} label="Vehicle Type" value={staff.vehicle_type} />
            <InfoRow icon={Hash} label="Vehicle Number" value={staff.vehicle_number} />
            <div className="col-span-2 flex gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
              {staff.is_available
                ? <><CheckCircle2 size={14} className="mt-0.5 text-emerald-400" /><p className="text-sm text-emerald-300">Available for deliveries</p></>
                : <><XCircle size={14} className="mt-0.5 text-rose-400" /><p className="text-sm text-rose-300">Not available</p></>}
            </div>
          </div>
        </section>
      )}

      {/* Account status */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/40">Access</p>
        <div className="flex gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
          {staff.is_active
            ? <><ShieldCheck size={14} className="mt-0.5 text-emerald-400" /><p className="text-sm text-emerald-300">Account active — can log in</p></>
            : <><ShieldOff size={14} className="mt-0.5 text-rose-400" /><p className="text-sm text-rose-300">Account inactive — login blocked</p></>}
        </div>
      </section>

      {staff.remarks && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-mist/70">
          {staff.remarks}
        </div>
      )}

      <Button variant="ghost" onClick={startEdit} fullWidth className="mt-1 text-sm">Edit profile</Button>
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
    <Modal open={!!staff} onClose={onClose} title="Staff Member" className="max-w-3xl">
      {/* Header */}
      <div className="mb-5 flex items-center gap-4 rounded-xl bg-wave-gradient p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white overflow-hidden">
          {staff.profile_picture_url
            ? <img src={staff.profile_picture_url} alt="" className="h-full w-full object-cover" />
            : staff.full_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{staff.full_name}</h3>
          <p className="text-sm text-white/70">{staff.designation || staff.department || "@" + staff.username}</p>
          {staff.employee_id && <p className="text-xs text-white/50">ID: {staff.employee_id}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={staff.working_status} />
          <span className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            staff.is_active
              ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-200"
              : "bg-rose-400/20 border-rose-400/30 text-rose-200"
          )}>
            {staff.is_active ? "Account Active" : "Account Inactive"}
          </span>
          {staff.is_rider && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white">
              <Bike size={11} /> Rider
            </span>
          )}
        </div>
      </div>

      {/* Rider stats */}
      {staff.is_rider && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-xs text-mist/40">Assigned</p>
            <p className="text-xl font-bold text-mist">{staff.total_deliveries ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-xs text-mist/40">Delivered</p>
            <p className="text-xl font-bold text-emerald-300">{staff.delivered_count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-xs text-mist/40">Rate</p>
            <p className="text-xl font-bold text-wave">{deliveryRate}%</p>
          </div>
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

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {tab === "profile" && <ProfileTab staff={staff} onUpdated={onUpdated} />}
        {tab === "documents" && <DocumentsTab staff={staff} onUpdated={onUpdated} />}
        {tab === "history" && <HistoryTable orders={history.data} loading={history.loading} />}
      </div>
    </Modal>
  );
}
