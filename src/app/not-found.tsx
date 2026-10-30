import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        We could not find that page
      </h1>
      <p className="text-base text-zinc-700 dark:text-zinc-300">
        Check the address. If you are tracking a report, check the tracking ID for typos.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/report"
          className="flex min-h-12 items-center rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Report a problem
        </Link>
        <Link
          href="/"
          className="flex min-h-12 items-center rounded-lg px-4 py-3 text-base font-medium text-zinc-900 underline focus:outline-none focus:ring-2 focus:ring-zinc-900/40 dark:text-zinc-100"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
