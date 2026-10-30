"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { primaryButton } from "@/components/ui/button-styles";

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
      className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6"
    >
      <h2
        ref={headingRef}
        id="confirmation-title"
        tabIndex={-1}
        className="text-2xl font-semibold text-zinc-950 focus:outline-none"
      >
        Thank you. Your report is in.
      </h2>
      <div className="flex flex-col gap-2">
        <p className="text-base text-zinc-700">Keep this tracking ID to follow progress:</p>
        <p className="font-mono text-2xl font-semibold tracking-wider text-zinc-950">{reportId}</p>
      </div>
      <Link href={`/track/${reportId}`} className={primaryButton}>
        Track this report
      </Link>
      <button
        type="button"
        onClick={onSubmitAnother}
        className="min-h-12 rounded-lg px-4 py-3 text-base font-medium text-brand-800 underline focus:outline-none focus:ring-2 focus:ring-brand-700/40"
      >
        Report another problem
      </button>
    </section>
  );
}
