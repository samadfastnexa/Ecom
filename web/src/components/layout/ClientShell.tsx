"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WaveBackground } from "./WaveBackground";

const BYPASS_PREFIXES = ["/manage", "/login", "/register"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBypass = BYPASS_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBypass) {
    return <>{children}</>;
  }

  return (
    <>
      <WaveBackground />
      <Navbar />
      <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
