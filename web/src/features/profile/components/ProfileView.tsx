"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  BadgeCheck,
  Truck,
  LogOut,
  Pencil,
  X,
  Lock,
  Check,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { Button, Chip, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { ProfileRow } from "./ProfileRow";

export function ProfileView() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    address: "",
  });

  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  if (!user) return null;

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;
  const roleLabel = (user.user_type || "customer").replace("_", " ");

  const startEdit = () => {
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone_number: user.phone_number ?? "",
      address: user.address ?? "",
    });
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await authApi.updateProfile({
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        email: form.email || undefined,
        phone_number: form.phone_number || null,
        address: form.address || null,
      });
      await refreshProfile();
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwSaving(true);
    setPwError("");
    setPwSuccess(false);
    try {
      await authApi.changePassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ old_password: "", new_password: "", confirm: "" });
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      {/* Profile card */}
      <div className="glass-strong overflow-hidden">
        {/* Header banner */}
        <div className="relative flex items-center gap-4 bg-wave-gradient px-6 py-8">
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full animate-wave bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
          </div>
          <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold text-white backdrop-blur">
            {fullName.charAt(0).toUpperCase()}
          </span>
          <div className="relative flex-1">
            <h1 className="text-2xl font-bold text-white">{fullName}</h1>
            <Chip className="mt-1 bg-white/20 text-white">
              <BadgeCheck size={14} />
              {roleLabel}
            </Chip>
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
              title="Edit profile"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        <div className="p-6">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                />
                <Input
                  label="Last name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone_number}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone_number: e.target.value }))
                }
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
              {saveError && (
                <p className="text-sm text-rose-300">{saveError}</p>
              )}
              <div className="flex gap-3">
                <Button onClick={saveEdit} loading={saving} className="flex-1">
                  <Check size={16} /> Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1"
                >
                  <X size={16} /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ProfileRow icon={User} label="Username" value={user.username} />
              <ProfileRow icon={Mail} label="Email" value={user.email} />
              <ProfileRow icon={Phone} label="Phone" value={user.phone_number} />
              <ProfileRow icon={MapPin} label="Address" value={user.address} />
              {user.user_type === "delivery_boy" && (
                <>
                  <ProfileRow
                    icon={Truck}
                    label="Vehicle"
                    value={user.vehicle_type}
                  />
                  <ProfileRow
                    icon={BadgeCheck}
                    label="Vehicle number"
                    value={user.vehicle_number}
                  />
                </>
              )}
              <Button
                variant="danger"
                onClick={handleLogout}
                fullWidth
                className="mt-6"
              >
                <LogOut size={18} /> Log out
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Account balance card — visible to customers */}
      {!editing && user.user_type === "customer" && (() => {
        const balance = parseFloat(user.account_balance ?? "0");
        const isCredit = balance > 0;
        const isDebt = balance < 0;
        const BalanceIcon = isCredit ? TrendingUp : isDebt ? TrendingDown : Wallet;
        return (
          <div className={cn(
            "glass-strong p-5 flex items-center gap-4",
            isCredit && "border border-emerald-400/20",
            isDebt && "border border-rose-400/20"
          )}>
            <span className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              isCredit && "bg-emerald-400/15 text-emerald-300",
              isDebt && "bg-rose-400/15 text-rose-300",
              !isCredit && !isDebt && "bg-white/10 text-mist/50"
            )}>
              <BalanceIcon size={22} />
            </span>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-mist/40">Account Balance</p>
              <p className={cn(
                "text-xl font-bold",
                isCredit && "text-emerald-300",
                isDebt && "text-rose-300",
                !isCredit && !isDebt && "text-mist/50"
              )}>
                {isCredit ? "+" : ""}{formatPrice(Math.abs(balance))}
              </p>
            </div>
            <p className="text-xs text-mist/40 text-right max-w-[120px]">
              {isCredit ? "Available credit for next order" : isDebt ? "Outstanding amount owed" : "No outstanding balance"}
            </p>
          </div>
        );
      })()}

      {/* Change password card */}
      {!editing && (
        <div className="glass-strong p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-mist">
            <Lock size={18} className="text-wave" /> Change password
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Current password"
              type="password"
              value={pwForm.old_password}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, old_password: e.target.value }))
              }
              autoComplete="current-password"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="New password"
                type="password"
                value={pwForm.new_password}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, new_password: e.target.value }))
                }
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                value={pwForm.confirm}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, confirm: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            {pwError && <p className="text-sm text-rose-300">{pwError}</p>}
            {pwSuccess && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-300">
                <Check size={15} /> Password changed successfully.
              </p>
            )}
            <Button
              onClick={changePassword}
              loading={pwSaving}
              disabled={
                !pwForm.old_password ||
                !pwForm.new_password ||
                !pwForm.confirm
              }
            >
              Update password
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
