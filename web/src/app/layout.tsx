import type { Metadata } from "next";
import "./globals.css";
import { Navbar, Footer, WaveBackground } from "@/components/layout";
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
          <WaveBackground />
          <Navbar />
          <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
