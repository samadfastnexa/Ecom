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
  LayoutDashboard,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

const GUEST_LINKS = [
  { href: "/", label: "Shop", icon: Droplets },
];

const AUTH_LINKS = [
  { href: "/", label: "Shop", icon: Droplets },
  { href: "/orders", label: "Orders", icon: Package },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const LINKS = user ? AUTH_LINKS : GUEST_LINKS;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-abyss/60 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-gradient shadow-glow">
            <Droplets size={20} className="text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-mist">
            Century<span className="text-wave"> Sip</span>
          </span>
        </Link>

        {/* Desktop nav links */}
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

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Cart */}
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
                <Link
                  href="/manage/orders"
                  className="flex items-center gap-1.5 rounded-xl border border-wave/40 bg-wave/10 px-3 py-2 text-sm font-medium text-wave transition hover:bg-wave/20"
                >
                  <LayoutDashboard size={15} />
                  Admin
                </Link>
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

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist md:hidden"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
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
                  <Link
                    href="/manage/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-wave/10 px-3 py-2.5 text-sm font-medium text-wave"
                  >
                    <LayoutDashboard size={16} /> Admin Panel
                  </Link>
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
