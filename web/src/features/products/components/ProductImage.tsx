import { Droplet } from "lucide-react";
import { imageUrl } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ProductImageProps {
  image: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}

/** Renders a product image or a themed placeholder when none exists. */
export function ProductImage({
  image,
  alt,
  className,
  iconSize = 56,
}: ProductImageProps) {
  const src = imageUrl(image);
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-gradient-to-br from-deep/40 to-ocean/30",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Droplet size={iconSize} className="text-wave/40" />
      )}
    </div>
  );
}
