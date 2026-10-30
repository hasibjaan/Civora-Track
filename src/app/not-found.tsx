import type { Metadata } from "next";
import Link from "next/link";

import { primaryButton } from "@/components/ui/button-styles";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
        We could not find that page
      </h1>
      <p className="text-base text-zinc-700">
        Check the address. If you are tracking a report, check the tracking ID for typos.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/report" className={primaryButton}>
          Report a problem
        </Link>
        <Link
          href="/"
          className="flex min-h-12 items-center rounded-lg px-4 py-3 text-base font-medium text-brand-800 underline focus:outline-none focus:ring-2 focus:ring-brand-700/40"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
