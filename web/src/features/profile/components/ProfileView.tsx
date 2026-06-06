"use client";

import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, BadgeCheck, Truck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Chip } from "@/components/ui";
import { ProfileRow } from "./ProfileRow";

export function ProfileView() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username;

  // user_type can be null for accounts whose profile was never categorised.
  const roleLabel = (user.user_type || "customer").replace("_", " ");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="glass-strong overflow-hidden">
        <div className="relative flex items-center gap-4 bg-wave-gradient px-6 py-8">
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full animate-wave bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
          </div>
          <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold text-white backdrop-blur">
            {fullName.charAt(0).toUpperCase()}
          </span>
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">{fullName}</h1>
            <Chip className="mt-1 bg-white/20 text-white">
              <BadgeCheck size={14} />
              {roleLabel}
            </Chip>
          </div>
        </div>

        <div className="p-6">
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
        </div>
      </div>
    </div>
  );
}
