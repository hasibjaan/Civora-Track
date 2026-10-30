"use client";

import { useEffect } from "react";

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
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="text-base text-zinc-700 dark:text-zinc-300">
        The problem is on our side, not yours. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={retry}
        className="flex min-h-12 w-fit items-center rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try again
      </button>
    </main>
  );
}
