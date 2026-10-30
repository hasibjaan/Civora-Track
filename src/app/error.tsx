"use client";

import { useEffect } from "react";

import { primaryButton } from "@/components/ui/button-styles";

/** Shown when a page fails unexpectedly. The details are logged in the browser, not shown. */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Something went wrong</h1>
      <p className="text-base text-zinc-700">
        The problem is on our side, not yours. Please try again in a moment.
      </p>
      <button type="button" onClick={retry} className={`${primaryButton} w-fit`}>
        Try again
      </button>
    </main>
  );
}
