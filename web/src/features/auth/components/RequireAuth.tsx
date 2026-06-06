"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Droplets } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Wraps pages that require a logged-in user; redirects to /login otherwise. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-mist/60">
        <Droplets size={40} className="animate-float text-wave" />
        <p>Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
