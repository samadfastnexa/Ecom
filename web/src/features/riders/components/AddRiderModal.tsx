"use client";

import { useState } from "react";
import { User, Lock, Phone, Truck, Hash } from "lucide-react";
import type { CreateRiderPayload } from "@/lib/types";
import { ridersApi } from "@/lib/api/riders";
import { Button, Input, Modal, useToast } from "@/components/ui";

interface AddRiderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddRiderModal({ open, onClose, onCreated }: AddRiderModalProps) {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<CreateRiderPayload & { confirm: string }>({
    username: "",
    email: "",
    password: "",
    confirm: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    vehicle_type: "",
    vehicle_number: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setForm({
      username: "", email: "", password: "", confirm: "",
      first_name: "", last_name: "", phone_number: "", vehicle_type: "", vehicle_number: "",
    });
    setError("");
  };

  const submit = async () => {
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (!form.password) { setError("Password is required."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setSaving(true);
    setError("");
    try {
      await ridersApi.create({
        username: form.username,
        email: form.email || undefined,
        password: form.password,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        phone_number: form.phone_number || undefined,
        vehicle_type: form.vehicle_type || undefined,
        vehicle_number: form.vehicle_number || undefined,
      });
      notify("Delivery boy registered successfully.");
      onCreated();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rider.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Delivery Boy" className="max-w-lg">
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Account */}
        <p className="text-xs font-semibold uppercase tracking-wide text-mist/40">Account</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" placeholder="Ali" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <Input label="Last name" placeholder="Hassan" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input label="Username *" placeholder="ali.rider" value={form.username} onChange={(e) => set("username", e.target.value)} icon={<User size={15} />} />
        <Input label="Email" type="email" placeholder="ali@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Password *" type="password" placeholder="Min 6 chars" value={form.password} onChange={(e) => set("password", e.target.value)} icon={<Lock size={15} />} />
          <Input label="Confirm password *" type="password" placeholder="Repeat" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} icon={<Lock size={15} />} />
        </div>

        {/* Vehicle */}
        <p className="text-xs font-semibold uppercase tracking-wide text-mist/40">Vehicle & contact</p>
        <Input label="Phone number" placeholder="03xx-xxxxxxx" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} icon={<Phone size={15} />} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Vehicle type" placeholder="Bike, Motorcycle…" value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)} icon={<Truck size={15} />} />
          <Input label="Vehicle number" placeholder="ABC-1234" value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} icon={<Hash size={15} />} />
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button onClick={submit} loading={saving} fullWidth>Register rider</Button>
          <Button variant="ghost" onClick={onClose} disabled={saving} fullWidth>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
