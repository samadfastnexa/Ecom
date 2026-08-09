"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  AddressFields,
  Button,
  Input,
  Modal,
  hasAddressInput,
  validateAddress,
  EMPTY_ADDRESS,
  useToast,
  type AddressErrors,
  type AddressParts,
} from "@/components/ui";
import { customersApi } from "@/lib/api";
import type { CreateCustomerPayload } from "@/lib/types";

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
  password: "",
};

/**
 * Mirrors the backend's PASSWORD_RULES, in the same order. This form used to
 * accept six characters with no character requirements while signup demanded
 * the full policy — the weaker password simply came back a 400.
 */
const PASSWORD_RULES: [(p: string) => boolean, string][] = [
  [(p) => p.length >= 8, "Password must be at least 8 characters."],
  [(p) => /\d/.test(p), "Password must contain at least one digit."],
  [(p) => /\p{Lu}/u.test(p), "Password must contain at least one uppercase letter."],
  [(p) => /\p{Ll}/u.test(p), "Password must contain at least one lowercase letter."],
  [(p) => /[^\p{L}\p{N}]/u.test(p), "Password must contain at least one special character."],
];

const passwordPolicyError = (password: string) =>
  PASSWORD_RULES.find(([passes]) => !passes(password))?.[1] ?? null;

export function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const notify = useToast();
  const [form, setForm] = useState(EMPTY);
  const [address, setAddress] = useState<AddressParts>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm(EMPTY);
    setAddress(EMPTY_ADDRESS);
    setAddressErrors({});
    setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // An address is optional here, but a half-filled one is not: without a
    // house number and an area a rider has nowhere to go.
    const wantsAddress = hasAddressInput(address);
    const issues = wantsAddress ? validateAddress(address) : {};
    setAddressErrors(issues);

    if (!form.username.trim()) { setError("Username is required."); return; }
    if (form.password) {
      const policyError = passwordPolicyError(form.password);
      if (policyError) { setError(policyError); return; }
    }
    if (Object.keys(issues).length > 0) { setError("Complete the address or clear it."); return; }

    const payload: CreateCustomerPayload = {
      username: form.username.trim(),
      first_name: form.first_name.trim() || undefined,
      last_name: form.last_name.trim() || undefined,
      email: form.email.trim() || undefined,
      phone_number: form.phone_number.trim() || undefined,
    };
    // Omitting the password entirely is what tells the backend to store an
    // unusable one; sending "" would be a password the customer can never type.
    if (form.password) payload.password = form.password;
    if (wantsAddress) {
      payload.house_number = address.house_number.trim();
      payload.portion = address.portion.trim() || undefined;
      payload.block = address.block.trim() || undefined;
      payload.area = address.area.trim();
    }

    setSaving(true);
    try {
      const created = await customersApi.create(payload);
      notify(
        created.can_sign_in
          ? "Customer created."
          : "Customer saved without sign-in access — set a password to let them log in.",
        created.can_sign_in ? "success" : "info"
      );
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
          <Input
            label="First name"
            requirement="optional"
            placeholder="Ali"
            value={form.first_name}
            onChange={set("first_name")}
          />
          <Input
            label="Last name"
            requirement="optional"
            placeholder="Hassan"
            value={form.last_name}
            onChange={set("last_name")}
          />
        </div>

        <Input
          label="Username"
          requirement="required"
          placeholder="alihassan"
          autoCapitalize="none"
          value={form.username}
          onChange={set("username")}
          required
        />

        <Input
          label="Email"
          requirement="optional"
          type="email"
          placeholder="ali@example.com"
          value={form.email}
          onChange={set("email")}
        />

        <Input
          label="Phone"
          requirement="optional"
          type="tel"
          placeholder="03xx-xxxxxxx"
          value={form.phone_number}
          onChange={set("phone_number")}
        />

        <AddressFields
          value={address}
          onChange={setAddress}
          errors={addressErrors}
          required={false}
        />

        <div>
          <Input
            label="Password"
            requirement="optional"
            type="password"
            placeholder="Leave blank for a record-only customer"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
          <p className="mt-1.5 text-xs text-mist/50">
            Leave blank for walk-in and phone-in customers — the account is saved
            but cannot be signed into until an admin sets a password. If you do
            set one it needs 8+ chars with upper, lower, a digit and a special
            character.
          </p>
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
