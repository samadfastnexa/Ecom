"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldLabel, type Requirement } from "./FieldLabel";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  /** Shows a Required/Optional pill beside the label. */
  requirement?: Requirement;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, requirement, className, id, ...rest },
  ref
) {
  const inputId = id || rest.name;
  return (
    <div>
      {label && (
        <FieldLabel htmlFor={inputId} requirement={requirement}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist/40">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn("input", icon ? "pl-11" : null, className)}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-sm text-rose-300">{error}</p>}
    </div>
  );
});
