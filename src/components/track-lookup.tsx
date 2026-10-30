"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { inputClassName } from "@/components/report-form/form-field";
import { secondaryButton } from "@/components/ui/button-styles";
import { TRACKING_ID_PATTERN } from "@/domain/schemas";

interface TrackLookupProps {
  label?: string;
}

/** Lets a citizen open their report by typing the tracking ID they were given. */
export function TrackLookup({ label = "Tracking ID" }: TrackLookupProps) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // IDs are shown in capitals, but people often type them in lower case.
    const trackingId = value.trim().toUpperCase();
    if (!TRACKING_ID_PATTERN.test(trackingId)) {
      setError("Enter the tracking ID you were given, for example RPT-3F9A1C2B5D7E.");
      return;
    }
    setError(null);
    router.push(`/track/${trackingId}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-base font-medium text-zinc-900">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="RPT-…"
          className={inputClassName}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className={`${secondaryButton} shrink-0`}>
          Track
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
