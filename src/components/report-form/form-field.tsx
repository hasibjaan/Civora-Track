import type { ReactNode } from "react";

/** Shared styling so every control has the same size and focus ring. Text is 16px to stop iOS zooming in. */
export const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-950 placeholder:text-zinc-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 aria-invalid:border-red-600";

interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-700">
      {message}
    </p>
  );
}

interface FieldLabelProps {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldLabel({ htmlFor, required = false, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-base font-medium text-zinc-900">
      {children}
      {required && <span className="ml-1 text-red-700">*</span>}
    </label>
  );
}
