"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { customersApi } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone_number: "",
  address: "",
  password: "",
};

export function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => { setForm(EMPTY); setError(""); };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      await customersApi.create({
        username: form.username.trim(),
        password: form.password,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Customer" className="max-w-3xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">First Name</label>
            <input className="input w-full" placeholder="Ali" value={form.first_name} onChange={set("first_name")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">Last Name</label>
            <input className="input w-full" placeholder="Hassan" value={form.last_name} onChange={set("last_name")} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">
            Username <span className="text-rose-400">*</span>
          </label>
          <input className="input w-full" placeholder="alihassan" autoCapitalize="none" value={form.username} onChange={set("username")} required />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">Email</label>
          <input className="input w-full" type="email" placeholder="ali@example.com" value={form.email} onChange={set("email")} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">Phone</label>
          <input className="input w-full" type="tel" placeholder="03xx-xxxxxxx" value={form.phone_number} onChange={set("phone_number")} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">Address</label>
          <textarea className="input w-full resize-none" rows={2} placeholder="House #, Street, Area" value={form.address} onChange={set("address")} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist/50">
            Password <span className="text-rose-400">*</span>
          </label>
          <input className="input w-full" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} required />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        )}

        <Button type="submit" loading={saving} fullWidth>
          <UserPlus size={16} /> Create Account
        </Button>
      </form>
    </Modal>
  );
}
