import { Droplets } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: "md" | "lg";
}

/** Centered card layout shared by the login and register screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  maxWidth = "md",
}: AuthShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex flex-col items-center",
        maxWidth === "lg" ? "max-w-lg" : "max-w-md"
      )}
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wave-gradient shadow-glow">
          <Droplets size={28} className="text-white" />
        </span>
        <h1 className="text-2xl font-bold text-mist">{title}</h1>
        <p className="text-mist/60">{subtitle}</p>
      </div>
      <div className="glass-strong w-full p-7">{children}</div>
    </div>
  );
}
