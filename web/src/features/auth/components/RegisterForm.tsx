"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  AddressFields,
  Button,
  Input,
  useToast,
  validateAddress,
  EMPTY_ADDRESS,
  type AddressErrors,
  type AddressParts,
} from "@/components/ui";
import { AuthShell } from "./AuthShell";
import { GoogleDivider, GoogleSignInButton } from "./GoogleSignInButton";

const EMPTY = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  password_confirm: "",
  phone_number: "",
};

// Pakistani mobile numbers: 03xx-xxxxxxx, +923xxxxxxxxx or 923xxxxxxxxx
const PHONE_PATTERN = /^(?:\+92|92|0)3\d{9}$/;
const stripPhoneSeparators = (value: string) => value.replace(/[\s\-().]/g, "");

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const notify = useToast();

  const [form, setForm] = useState(EMPTY);
  const [address, setAddress] = useState<AddressParts>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set =
    (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirm) {
      setError("Passwords don't match.");
      return;
    }

    if (!PHONE_PATTERN.test(stripPhoneSeparators(form.phone_number))) {
      setError("Enter a valid mobile number, e.g. 0300-1234567.");
      return;
    }

    // The address parts live outside the native form controls now, so the
    // browser's own `required` no longer covers them.
    const issues = validateAddress(address);
    setAddressErrors(issues);
    if (Object.keys(issues).length > 0) {
      setError("Complete your delivery address.");
      return;
    }

    setLoading(true);
    try {
      await register({
        ...form,
        phone_number: stripPhoneSeparators(form.phone_number),
        house_number: address.house_number.trim(),
        // A canonical key, never the label the picker shows.
        portion: address.portion || undefined,
        block: address.block.trim() || undefined,
        area: address.area.trim(),
      });
      notify("Account created — welcome aboard!");
      router.push("/");
    } catch (err) {
      let msg = "Registration failed.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          msg = Object.values(parsed).flat().join(" ");
        } catch {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join Century Sip in a few seconds"
      maxWidth="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.first_name}
            onChange={set("first_name")}
            placeholder="Aqua"
          />
          <Input
            label="Last name"
            value={form.last_name}
            onChange={set("last_name")}
            placeholder="Diver"
          />
        </div>

        <Input
          label="Username"
          value={form.username}
          onChange={set("username")}
          placeholder="aquadiver"
          autoComplete="username"
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={form.password_confirm}
            onChange={set("password_confirm")}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        <p className="text-xs text-mist/50">
          Password needs 8+ chars with upper, lower, a digit and a special
          character.
        </p>

        <Input
          label="Phone number"
          type="tel"
          value={form.phone_number}
          onChange={set("phone_number")}
          placeholder="03xx-xxxxxxx"
          autoComplete="tel"
          required
        />

        {/* The shared component staff forms use, so an address is captured the
            same way whoever types it. */}
        <AddressFields
          value={address}
          onChange={setAddress}
          errors={addressErrors}
        />
        <p className="text-xs text-mist/50">
          We use this as your default delivery address.
        </p>

        {error && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} fullWidth>
          <UserPlus size={18} /> Create account
        </Button>

        <p className="text-center text-sm text-mist/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-wave hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>

      <GoogleDivider />

      <GoogleSignInButton
        label="Sign up with Google"
        disabled={loading}
        onAuthenticated={() => {
          notify("Account created — welcome aboard!");
          router.push("/");
        }}
        onError={(msg) => setError(msg || null)}
      />
    </AuthShell>
  );
}
