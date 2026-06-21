"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Droplets,
  ShoppingBag,
  ClipboardList,
  Users,
  UserCog,
  Activity,
  Settings,
  LogOut,
  Store,
  LifeBuoy,
  Factory,
  Bell,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/manage/orders", label: "Orders", icon: ClipboardList },
  { href: "/manage/shop", label: "Shop", icon: ShoppingBag },
  { href: "/manage/customers", label: "Customers", icon: Users },
  { href: "/manage/staff", label: "Staff", icon: UserCog },
  { href: "/manage/complaints", label: "Complaints", icon: LifeBuoy },
  { href: "/manage/notifications", label: "Notifications", icon: Bell },
  { href: "/manage/plant", label: "Plant", icon: Factory },
  { href: "/manage/activity", label: "Activity Logs", icon: Activity },
  { href: "/manage/settings", label: "Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  const navigate = (href: string) => {
    if (href === pathname) return;
    setLoadingHref(href);
    router.push(href);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initial = (
    user?.first_name?.[0] ||
    user?.username?.[0] ||
    "A"
  ).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#070c16]">
      {/* ── Sidebar ── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/10 bg-abyss">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wave-gradient shadow-glow">
            <Droplets size={15} className="text-white" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-mist">Century Sip</p>
            <p className="text-[10px] uppercase tracking-widest text-mist/40">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            const isLoading = loadingHref === href;
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                disabled={!!loadingHref}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full",
                  active
                    ? "bg-wave/15 text-wave"
                    : "text-mist/60 hover:bg-white/5 hover:text-mist",
                  isLoading && "bg-wave/10 text-wave"
                )}
              >
                {isLoading
                  ? <Loader2 size={16} className="shrink-0 animate-spin" />
                  : <Icon size={16} className="shrink-0" />
                }
                {label}
              </button>
            );
          })}

          <div className="my-2 border-t border-white/10" />

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-mist/50 transition-colors hover:bg-white/5 hover:text-mist text-left w-full"
          >
            <Store size={16} className="shrink-0" />
            View Store
          </button>
        </nav>

        {/* User card */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wave/20 text-xs font-bold text-wave">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-mist">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name || ""}`.trim()
                  : user?.username}
              </p>
              <p className="text-[10px] text-mist/40">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 text-mist/40 transition hover:text-rose-300"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        {/* Top progress bar */}
        {loadingHref && (
          <div className="absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-white/5">
            <div className="h-full w-1/2 animate-nav-progress rounded-full bg-wave" />
          </div>
        )}
        <div className={cn("p-6 transition-opacity duration-150", loadingHref && "opacity-50 pointer-events-none")}>
          {children}
        </div>
      </main>
    </div>
  );
}
