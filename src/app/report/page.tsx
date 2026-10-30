import type { Metadata } from "next";

import { ReportForm } from "@/components/report-form/report-form";

export const metadata: Metadata = {
  title: "Report a problem",
  description: "Report a pothole, blocked drain, broken streetlight or garbage pile.",
};

export default function ReportPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Report a problem
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Takes about a minute. Fields marked * are required.
        </p>
      </header>
      <ReportForm />
    </main>
  );
}
