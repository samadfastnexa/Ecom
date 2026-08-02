"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, ShieldAlert } from "lucide-react";
import { passwordApi } from "@/lib/api/password";
import { Button, Input, useToast } from "@/components/ui";

const MIN_LENGTH = 6;

interface PasswordResetPanelProps {
  /** Django user id — on staff/rider records this is `profile.user_id`. */
  userId: number;
  /** Shown in the confirmation prompts so the admin can't reset the wrong account. */
  displayName: string;
}

/**
 * Admin-initiated password reset. The new password is shown on screen for the
 * admin to relay — nothing is emailed or texted to the user.
 */
export function PasswordResetPanel({ userId, displayName }: PasswordResetPanelProps) {
  const notify = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const failed = (e: unknown, fallback: string) =>
    setError(e instanceof Error ? e.message : fallback);

  const applyPassword = async () => {
    setError("");

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!window.confirm(`Set a new password for ${displayName}? They will be signed out of any active session next time their token expires.`)) {
      return;
    }

    setSaving(true);
    try {
      await passwordApi.set(userId, password);
      setPassword("");
      setConfirmPassword("");
      setGenerated(null);
      notify(`Password updated for ${displayName}.`);
    } catch (e) {
      failed(e, "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = async () => {
    setError("");
    if (!window.confirm(`Generate a temporary password for ${displayName}? Their current password stops working immediately.`)) {
      return;
    }

    setGenerating(true);
    try {
      const res = await passwordApi.generate(userId);
      setGenerated(res.new_password);
      setCopied(false);
      setPassword("");
      setConfirmPassword("");
      notify(`Temporary password generated for ${displayName}.`);
    } catch (e) {
      failed(e, "Failed to generate password.");
    } finally {
      setGenerating(false);
    }
  };

  const copyGenerated = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the password and copy it manually.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
        <p className="text-xs leading-relaxed text-amber-100/80">
          Resetting takes effect immediately. Nothing is emailed or texted — pass
          the new password to {displayName} yourself.
        </p>
      </div>

      {/* ── Generated password, shown once ─────────────────────────────── */}
      {generated && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-200">
            Temporary password — copy it now, it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-lg bg-black/30 px-3 py-2 font-mono text-sm text-emerald-100">
              {generated}
            </code>
            <Button variant="ghost" onClick={copyGenerated} className="shrink-0 text-sm">
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Set a specific password ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Input
            label="New password"
            type={reveal ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Min. ${MIN_LENGTH} characters`}
            autoComplete="new-password"
            icon={<KeyRound size={15} />}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-3 top-[34px] text-mist/40 transition hover:text-mist"
            aria-label={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Input
          label="Confirm new password"
          type={reveal ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat the password"
          autoComplete="new-password"
          icon={<KeyRound size={15} />}
        />

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="danger"
            onClick={applyPassword}
            loading={saving}
            disabled={generating || !password || !confirmPassword}
            fullWidth
          >
            <KeyRound size={15} /> Set password
          </Button>
          <Button
            variant="ghost"
            onClick={generatePassword}
            loading={generating}
            disabled={saving}
            fullWidth
          >
            <RefreshCw size={15} /> Generate temporary
          </Button>
        </div>
      </div>
    </div>
  );
}
