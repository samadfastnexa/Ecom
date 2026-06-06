"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      router.push(next);
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to AquaShop">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          icon={<User size={18} />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="superuser"
          autoComplete="username"
          required
        />
        <Input
          label="Password"
          type="password"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} fullWidth>
          <LogIn size={18} /> Sign in
        </Button>

        <p className="text-center text-sm text-mist/60">
          No account?{" "}
          <Link
            href="/register"
            className="font-semibold text-wave hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
