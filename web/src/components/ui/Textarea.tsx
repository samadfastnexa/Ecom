"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className, id, ...rest }, ref) {
    const fieldId = id || rest.name;
    return (
      <div>
        {label && (
          <label htmlFor={fieldId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={cn("input resize-none", className)}
          {...rest}
        />
        {error && <p className="mt-1 text-sm text-rose-300">{error}</p>}
      </div>
    );
  }
);
