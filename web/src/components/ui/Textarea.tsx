"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldLabel, type Requirement } from "./FieldLabel";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Shows a Required/Optional pill beside the label. */
  requirement?: Requirement;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, requirement, className, id, ...rest }, ref) {
    const fieldId = id || rest.name;
    return (
      <div>
        {label && (
          <FieldLabel htmlFor={fieldId} requirement={requirement}>
            {label}
          </FieldLabel>
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
