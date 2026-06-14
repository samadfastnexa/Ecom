import type { Metadata } from "next";
import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";
import { Providers } from "@/context/providers";

export const metadata: Metadata = {
  title: "Century Sip — Fresh deliveries",
  description: "Century Sip — Fresh water deliveries, straight to your door.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
