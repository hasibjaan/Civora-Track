"use client";

import { useRef } from "react";

import { FieldError, FieldLabel } from "./form-field";

interface ImageFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const ERROR_ID = "photo-error";

export function ImageField({ file, onChange, error }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="photo">Photo (optional)</FieldLabel>
      <input
        ref={inputRef}
        id="photo"
        type="file"
        accept="image/*"
        capture="environment"
        aria-invalid={Boolean(error)}
        aria-describedby={ERROR_ID}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="block w-full text-base text-zinc-700 file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-3 file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
      />
      {file && (
        <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="truncate">
            {file.name} ({formatSize(file.size)}). It will be resized before upload.
          </span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 min-h-10 rounded-md px-3 font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Remove
          </button>
        </div>
      )}
      <FieldError id={ERROR_ID} message={error} />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
