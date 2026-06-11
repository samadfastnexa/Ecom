"use client";

import { useState } from "react";
import {
  User, Lock, Phone, Truck, Hash, Briefcase, CreditCard, Calendar,
  Building2, Tag, DollarSign, AlertCircle,
} from "lucide-react";
import type { CreateStaffPayload, WorkingStatus } from "@/lib/types";
import { staffApi } from "@/lib/api/staff";
import { Button, Input, Modal, useToast } from "@/components/ui";

interface AddStaffModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type FormState = Omit<CreateStaffPayload, "salary"> & {
  confirm: string;
  salary: string;
};

const INITIAL: FormState = {
  username: "", email: "", password: "", confirm: "",
  first_name: "", last_name: "", phone_number: "", address: "",
  is_rider: false, vehicle_type: "", vehicle_number: "",
  employee_id: "", cnic_number: "", date_of_birth: "", date_of_joining: "",
  working_status: "Active", emergency_contact: "", department: "",
  designation: "", salary: "", remarks: "",
};

export function AddStaffModal({ open, onClose, onCreated }: AddStaffModalProps) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(INITIAL);

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const reset = () => { setForm(INITIAL); setError(""); };

  const submit = async () => {
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (!form.password) { setError("Password is required."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setSaving(true);
    setError("");
    try {
      const payload: CreateStaffPayload = {
        username: form.username.trim(),
        email: form.email || undefined,
        password: form.password,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        phone_number: form.phone_number || undefined,
        address: form.address || undefined,
        is_rider: form.is_rider,
        vehicle_type: form.is_rider ? form.vehicle_type || undefined : undefined,
        vehicle_number: form.is_rider ? form.vehicle_number || undefined : undefined,
        employee_id: form.employee_id || undefined,
        cnic_number: form.cnic_number || undefined,
        date_of_birth: form.date_of_birth || undefined,
        date_of_joining: form.date_of_joining || undefined,
        working_status: form.working_status as WorkingStatus,
        emergency_contact: form.emergency_contact || undefined,
        department: form.department || undefined,
        designation: form.designation || undefined,
        salary: form.salary ? parseFloat(form.salary) : undefined,
        remarks: form.remarks || undefined,
      };
      await staffApi.create(payload);
      notify("Staff member registered successfully.");
      onCreated();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create staff member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Staff Member" className="max-w-xl">
      <div className="flex flex-col gap-4 max-h-[78vh] overflow-y-auto pr-1">

        {/* Account */}
        <Section label="Account">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" placeholder="Ali" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            <Input label="Last name" placeholder="Hassan" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </div>
          <Input label="Username *" placeholder="ali.staff" value={form.username} onChange={(e) => set("username", e.target.value)} icon={<User size={15} />} />
          <Input label="Email" type="email" placeholder="ali@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Password *" type="password" placeholder="Min 6 chars" value={form.password} onChange={(e) => set("password", e.target.value)} icon={<Lock size={15} />} />
            <Input label="Confirm password *" type="password" placeholder="Repeat" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} icon={<Lock size={15} />} />
          </div>
        </Section>

        {/* Role */}
        <Section label="Role & Employment">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID" placeholder="EMP-001" value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} icon={<Hash size={15} />} />
            <div>
              <label className="label">Working Status</label>
              <select
                value={form.working_status}
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
            <Input label="Department" placeholder="Operations" value={form.department} onChange={(e) => set("department", e.target.value)} icon={<Building2 size={15} />} />
            <Input label="Designation" placeholder="Manager" value={form.designation} onChange={(e) => set("designation", e.target.value)} icon={<Tag size={15} />} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Joining" type="date" value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} icon={<Calendar size={15} />} />
            <Input label="Salary" type="number" min={0} step="0.01" placeholder="0.00" value={form.salary} onChange={(e) => set("salary", e.target.value)} icon={<DollarSign size={15} />} />
          </div>

          {/* Is Rider toggle */}
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={form.is_rider}
              onChange={(e) => set("is_rider", e.target.checked)}
              className="h-4 w-4 accent-wave"
            />
            <div>
              <p className="text-sm font-medium text-mist">Is Rider</p>
              <p className="text-xs text-mist/50">Can be assigned to delivery orders</p>
            </div>
          </label>

          {/* Rider-only fields */}
          {form.is_rider && (
            <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-wave/30">
              <Input label="Vehicle type" placeholder="Bike, Motorcycle…" value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)} icon={<Truck size={15} />} />
              <Input label="Vehicle number" placeholder="ABC-1234" value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} icon={<Hash size={15} />} />
            </div>
          )}
        </Section>

        {/* Personal */}
        <Section label="Personal Information">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} icon={<Calendar size={15} />} />
            <Input label="CNIC / ID Number" placeholder="XXXXX-XXXXXXX-X" value={form.cnic_number} onChange={(e) => set("cnic_number", e.target.value)} icon={<CreditCard size={15} />} />
          </div>
          <Input label="Phone Number" placeholder="03xx-xxxxxxx" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} icon={<Phone size={15} />} />
          <Input label="Emergency Contact" placeholder="03xx-xxxxxxx" value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} icon={<AlertCircle size={15} />} />
          <div>
            <label className="label">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Full address…"
              rows={2}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="label">Remarks / Notes</label>
            <textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Any notes…"
              rows={2}
              className="input resize-none"
            />
          </div>
        </Section>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button onClick={submit} loading={saving} fullWidth>
            <Briefcase size={15} /> Register Staff
          </Button>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={saving} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist/40">{label}</p>
      {children}
    </div>
  );
}
