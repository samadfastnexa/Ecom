import { Droplets } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-abyss/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-mist/60">
        <div className="flex items-center gap-2 text-mist">
          <Droplets size={18} className="text-wave" />
          <span className="font-semibold">AquaShop</span>
        </div>
        <p>Fresh deliveries, straight to your door.</p>
        <p className="text-xs text-mist/40">
          © {new Date().getFullYear()} AquaShop — Built with Next.js & Django.
        </p>
      </div>
    </footer>
  );
}
