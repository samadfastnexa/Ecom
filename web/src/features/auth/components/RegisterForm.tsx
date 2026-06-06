"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, useToast } from "@/components/ui";
import { AuthShell } from "./AuthShell";

const EMPTY = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  password_confirm: "",
};

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const notify = useToast();

  const [form, setForm] = useState(EMPTY);
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

    setLoading(true);
    try {
      await register(form);
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
      subtitle="Join AquaShop in a few seconds"
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
    </AuthShell>
  );
}
