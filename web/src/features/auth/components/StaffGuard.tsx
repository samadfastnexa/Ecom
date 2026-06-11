"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Droplets, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui";

export function StaffGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-mist/60">
        <Droplets size={40} className="animate-float text-wave" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user.is_staff) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert size={40} className="mx-auto text-rose-300" />
        <h2 className="mt-3 text-xl font-semibold text-mist">Access restricted</h2>
        <p className="mt-1 text-mist/60">
          This page is for staff only.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
