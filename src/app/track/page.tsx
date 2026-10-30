import type { Metadata } from "next";

import { TrackLookup } from "@/components/track-lookup";

export const metadata: Metadata = {
  title: "Track a report",
};

export default function TrackLookupPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Track a report</h1>
        <p className="text-base text-zinc-700">
          Enter the tracking ID you were given when you submitted your report.
        </p>
      </header>
      <TrackLookup />
    </main>
  );
}
