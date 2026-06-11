"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Droplets,
  ShoppingCart,
  User,
  Package,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Factory,
  Settings,
  ClipboardList,
  Bike,
  Users,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

const BASE_LINKS = [
  { href: "/", label: "Shop", icon: Droplets },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Show the Plant link only to users who can manage the plant.
  const LINKS = user?.can_manage_plant
    ? [...BASE_LINKS, { href: "/plant", label: "Plant", icon: Factory }]
    : BASE_LINKS;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-abyss/60 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-gradient shadow-glow">
            <Droplets size={20} className="text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-mist">
            Century<span className="text-wave"> Sip</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive(href)
                  ? "bg-white/10 text-wave"
                  : "text-mist/70 hover:bg-white/5 hover:text-mist"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist transition hover:bg-white/10"
            aria-label="Cart"
          >
            <ShoppingCart size={18} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-wave px-1 text-[11px] font-bold text-abyss">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-mist transition hover:bg-white/10"
              >
                <User size={16} />
                {user.first_name || user.username}
              </Link>
              {user.is_staff && (
                <>
                  <Link
                    href="/manage/orders"
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10",
                      isActive("/manage/orders") ? "text-wave" : "text-mist/80"
                    )}
                  >
                    <ClipboardList size={16} /> Orders
                  </Link>
                  <Link
                    href="/manage/staff"
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10",
                      isActive("/manage/staff") ? "text-wave" : "text-mist/80"
                    )}
                  >
                    <Users size={16} /> Staff
                  </Link>
                  <Link
                    href="/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist/80 transition hover:bg-white/10 hover:text-wave"
                    aria-label="Settings"
                  >
                    <Settings size={18} />
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist/80 transition hover:bg-rose-500/20 hover:text-rose-300"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary hidden md:inline-flex">
              Sign in
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist md:hidden"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive(href) ? "bg-white/10 text-wave" : "text-mist/80"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/80"
                >
                  <User size={16} /> {user.first_name || user.username}
                </Link>
                {user.is_staff && (
                  <>
                    <Link
                      href="/manage/orders"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/80"
                    >
                      <ClipboardList size={16} /> Orders (Admin)
                    </Link>
                    <Link
                      href="/manage/staff"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/80"
                    >
                      <Users size={16} /> Staff
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/80"
                    >
                      <Settings size={16} /> Settings
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-rose-300"
                >
                  <LogOut size={16} /> Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-primary mt-2"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
