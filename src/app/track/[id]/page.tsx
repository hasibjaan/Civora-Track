import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { buildCitizenView } from "@/application/citizen-view";
import { reportRepository } from "@/data";
import { TRACKING_ID_PATTERN } from "@/domain/schemas";

export const metadata: Metadata = {
  title: "Track your report",
  // Tracking pages show personal details, so they should not be indexed.
  robots: { index: false, follow: false },
};

// Status changes constantly, so this page always renders from live data. Blocking on the
// server keeps the 404 status code correct when a report does not exist.
export const instant = false;

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function TrackPage({ params }: PageProps<"/track/[id]">) {
  const { id } = await params;
  if (!TRACKING_ID_PATTERN.test(id)) notFound();

  const report = await reportRepository.get(id);
  if (!report) notFound();

  const primary = report.mergedInto ? await reportRepository.get(report.mergedInto) : undefined;
  const view = buildCitizenView(report, primary);

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{view.id}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {view.categoryLabel}
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Last updated{" "}
          <time dateTime={view.lastUpdated}>
            {DATE_FORMAT.format(new Date(view.lastUpdated))} UTC
          </time>
        </p>
      </header>

      <section
        aria-labelledby="status-heading"
        className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="status-heading" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Current status
        </h2>
        <p className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{view.statusLabel}</p>
        <p className="text-base text-zinc-800 dark:text-zinc-200">
          <span className="font-medium">What happens next: </span>
          {view.nextStep}
        </p>
      </section>

      <section aria-labelledby="progress-heading" className="flex flex-col gap-3">
        <h2 id="progress-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Progress
        </h2>
        <ol className="flex flex-col gap-4">
          {view.timeline.map((item, index) => (
            <li
              key={`${item.at}-${index}`}
              className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700"
            >
              <p className="text-base text-zinc-950 dark:text-zinc-50">{item.text}</p>
              <time dateTime={item.at} className="text-sm text-zinc-700 dark:text-zinc-300">
                {DATE_FORMAT.format(new Date(item.at))} UTC
              </time>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="details-heading" className="flex flex-col gap-3">
        <h2 id="details-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Your report
        </h2>
        <p className="text-base text-zinc-800 dark:text-zinc-200">{view.description}</p>
        {view.landmark && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">Near: {view.landmark}</p>
        )}
        {view.hasPhoto && (
          <Image
            src={`/api/reports/${view.id}/photo`}
            alt="Photo submitted with this report"
            width={1280}
            height={960}
            unoptimized
            className="h-auto w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
          />
        )}
      </section>
    </main>
  );
}
