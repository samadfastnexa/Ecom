"use client";

import { useRef } from "react";
import { ImageIcon, X } from "lucide-react";
import { MAX_IMAGES, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE_LABEL } from "@/lib/constants";

interface MultiImagePickerProps {
  label?: string;
  /** Newly-picked files (controlled). */
  value: File[];
  onChange: (files: File[]) => void;
  /** URLs of already-saved images (shown when editing, before new picks). */
  existing?: string[];
  /** Called with a user-facing error message (e.g. too many / too large). */
  onError?: (message: string) => void;
  max?: number;
}

/**
 * Pick up to `max` images (default 3), each at most 5 MB. Shows previews with
 * remove buttons. When `existing` URLs are passed (edit mode) and no new files
 * are picked, the caller should keep the existing images.
 */
export function MultiImagePicker({
  label = "Images",
  value,
  onChange,
  existing = [],
  onError,
  max = MAX_IMAGES,
}: MultiImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;

    const tooBig = picked.find((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      onError?.(`"${tooBig.name}" is larger than ${MAX_IMAGE_SIZE_LABEL}.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const combined = [...value, ...picked];
    if (combined.length > max) {
      onError?.(`You can upload at most ${max} images.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    onChange(combined);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const showExisting = existing.length > 0 && value.length === 0;
  const canAddMore = value.length < max;

  return (
    <div>
      <label className="label">
        {label}{" "}
        <span className="text-xs font-normal text-mist/40">
          (up to {max}, {MAX_IMAGE_SIZE_LABEL} each)
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {/* Existing saved images (edit mode, no new picks yet) */}
        {showExisting &&
          existing.map((url, i) => (
            <div
              key={`existing-${i}`}
              className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Current" className="h-full w-full object-cover" />
            </div>
          ))}

        {/* Newly picked previews */}
        {value.map((file, i) => (
          <div
            key={`new-${i}`}
            className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt={`Selected ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-abyss/80 text-mist/80 hover:text-rose-300"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {/* Add tile */}
        {canAddMore && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/5 transition hover:bg-white/10">
            <ImageIcon size={20} className="text-mist/30" />
            <span className="text-[10px] text-mist/50">Add</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePick}
            />
          </label>
        )}
      </div>

      {showExisting && (
        <p className="mt-1 text-xs text-mist/40">
          Adding new images will replace the current ones.
        </p>
      )}
    </div>
  );
}
