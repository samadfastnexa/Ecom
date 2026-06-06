"use client";

import { Droplets } from "lucide-react";
import type { Category } from "@/lib/types";
import { Chip } from "@/components/ui";

interface CategoryFilterProps {
  categories: Category[];
  active: number | null;
  onChange: (id: number | null) => void;
}

export function CategoryFilter({
  categories,
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => onChange(null)} className="contents">
        <Chip active={active === null} className="cursor-pointer px-4 py-2">
          <Droplets size={14} /> All
        </Chip>
      </button>
      {categories.map((c) => (
        <button key={c.id} onClick={() => onChange(c.id)} className="contents">
          <Chip active={active === c.id} className="cursor-pointer px-4 py-2">
            {c.name}
          </Chip>
        </button>
      ))}
    </div>
  );
}
