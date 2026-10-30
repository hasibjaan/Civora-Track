"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface SubmissionConfirmationProps {
  reportId: string;
  onSubmitAnother: () => void;
}

export function SubmissionConfirmation({ reportId, onSubmitAnother }: SubmissionConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen-reader users hear it straight after submitting.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="confirmation-title"
      className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2
        ref={headingRef}
        id="confirmation-title"
        tabIndex={-1}
        className="text-2xl font-semibold text-zinc-950 focus:outline-none dark:text-zinc-50"
      >
        Thank you. Your report is in.
      </h2>
      <div className="flex flex-col gap-2">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          Keep this tracking ID to follow progress:
        </p>
        <p className="font-mono text-2xl font-semibold tracking-wider text-zinc-950 dark:text-zinc-50">
          {reportId}
        </p>
      </div>
      <Link
        href={`/track/${reportId}`}
        className="flex min-h-12 items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Track this report
      </Link>
      <button
        type="button"
        onClick={onSubmitAnother}
        className="min-h-12 rounded-lg px-4 py-3 text-base font-medium text-zinc-900 underline focus:outline-none focus:ring-2 focus:ring-zinc-900/40 dark:text-zinc-100"
      >
        Report another problem
      </button>
    </section>
  );
}
