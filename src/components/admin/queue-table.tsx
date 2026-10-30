import Link from "next/link";

import { formatUtcDateTime } from "@/components/format-date";
import { CATEGORY_LABELS } from "@/domain/categories";
import { priorityOf } from "@/domain/queue";
import { STATUS_LABELS } from "@/domain/status";
import type { Report } from "@/domain/types";

import { PriorityBadge } from "./priority-badge";

export function QueueTable({ reports }: { reports: readonly Report[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-base text-zinc-700">
        Nothing is waiting for action. New reports will appear here.
      </p>
    );
  }

  return (
    // The wrapper scrolls sideways on phones, so it must be keyboard-focusable. It has no
    // role of its own: the enclosing section already names the region.
    <div
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/40"
    >
      <table className="w-full min-w-[46rem] text-left text-sm">
        <caption className="sr-only">Open reports, most urgent first</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Priority
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Problem
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Where
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Reported (UTC)
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Repeats
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const priority = priorityOf(report);
            return (
              <tr key={report.id} className="border-b border-zinc-100 align-top last:border-0">
                <th scope="row" className="px-4 py-3 font-normal">
                  <div className="flex flex-col items-start gap-1">
                    <PriorityBadge level={priority.level} />
                    <span className="text-xs text-zinc-600">Score {priority.score}</span>
                  </div>
                </th>
                <td className="break-words px-4 py-3">
                  <p className="font-medium text-zinc-950">{CATEGORY_LABELS[report.category]}</p>
                  <p className="mt-1 text-zinc-700">
                    {report.analysis?.summary ?? report.description}
                  </p>
                  <Link
                    href={`/admin/reports/${report.id}`}
                    className="mt-2 inline-block font-mono text-sm text-brand-800 underline underline-offset-2"
                  >
                    {report.id}
                    <span className="sr-only"> (open report)</span>
                  </Link>
                </td>
                <td className="break-words px-4 py-3 text-zinc-700">
                  {report.location.address ?? "No landmark given"}
                </td>
                <td className="break-words px-4 py-3 whitespace-nowrap text-zinc-700">
                  <time dateTime={report.reportedAt}>{formatUtcDateTime(report.reportedAt)}</time>
                </td>
                <td className="break-words px-4 py-3 text-zinc-700">
                  {STATUS_LABELS[report.status]}
                </td>
                <td className="break-words px-4 py-3 text-zinc-700">
                  {report.analysis?.duplicateOf.length ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
