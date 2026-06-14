"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, LogIn, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const profile = await login(username, password);
      if (next !== "/") {
        router.push(next);
      } else {
        router.push(profile?.is_staff ? "/manage/orders" : "/");
      }
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to Century Sip">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          icon={<User size={18} />}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          autoComplete="username"
          required
        />

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist/40">
              <Lock size={18} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="input pl-11 pr-11 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mist/40 hover:text-mist transition"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} fullWidth>
          <LogIn size={18} /> Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
