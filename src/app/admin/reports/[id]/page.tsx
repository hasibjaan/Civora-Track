import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { briefFor } from "@/ai";
import { reportFacts } from "@/application/briefs";
import { withCurrentPriorities } from "@/application/current-reports";
import { reportRepository } from "@/data";
import { BriefView } from "@/components/admin/brief-view";
import { PriorityBadge } from "@/components/admin/priority-badge";
import { HistoryList } from "@/components/admin/history-list";
import {
  AssignForm,
  CategoryForm,
  MergeForm,
  PriorityForm,
  StatusForm,
} from "@/components/admin/officer-forms";
import { CATEGORY_LABELS } from "@/domain/categories";
import { isOpenReport } from "@/domain/open-reports";
import { PRIORITY_LABELS } from "@/domain/priority";
import { priorityOf } from "@/domain/queue";
import { TRACKING_ID_PATTERN } from "@/domain/schemas";
import { canChangeTeam } from "@/domain/officer-actions";
import { allowedNextStatuses, STATUS_LABELS } from "@/domain/status";
import { TEAM_FOR_CATEGORY, TEAM_LABELS } from "@/domain/teams";

import {
  assignAction,
  changeCategoryAction,
  changePriorityAction,
  changeStatusAction,
  mergeAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Report details",
  robots: { index: false, follow: false },
};

export default async function ReportDetailPage({ params }: PageProps<"/admin/reports/[id]">) {
  const { id } = await params;
  if (!TRACKING_ID_PATTERN.test(id)) notFound();

  // Priorities are recalculated from the reports as they are now, so they stay current.
  const reports = withCurrentPriorities(await reportRepository.list(), new Date());
  const report = reports.find((item) => item.id === id);
  if (!report) notFound();

  const open = isOpenReport(report);
  const priority = priorityOf(report);
  const mergedHere = reports.filter((item) => item.mergedInto === report.id);
  const mergeTargets = reports
    .filter((item) => isOpenReport(item) && item.id !== report.id)
    .map((item) => ({
      value: item.id,
      label: `${item.id}: ${CATEGORY_LABELS[item.category]}, ${item.location.address ?? "no landmark"}`,
    }));
  const suggestedTarget = report.analysis?.duplicateOf.find((duplicateId) =>
    mergeTargets.some((target) => target.value === duplicateId),
  );
  // Assigning a team is the only way to reach Assigned, so the status form leaves it out.
  // The report's age depends on the current time, so this must render per request.
  await connection();
  const brief = await briefFor(reportFacts(report, new Date()));
  const statusOptions = allowedNextStatuses(report.status).filter(
    (status) => status !== "assigned",
  );

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <Link
        href="/admin"
        className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
      >
        Back to the dashboard
      </Link>

      <header className="flex flex-col gap-3">
        <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{report.id}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {CATEGORY_LABELS[report.category]}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-base text-zinc-800 dark:text-zinc-200">
          <span>Status: {STATUS_LABELS[report.status]}</span>
          <PriorityBadge level={priority.level} />
          {report.priorityOverride && (
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Set by an officer: {PRIORITY_LABELS[report.priorityOverride.level]}
            </span>
          )}
        </div>
      </header>

      <section aria-labelledby="report-heading" className="flex flex-col gap-3">
        <h2 id="report-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Report
        </h2>
        <p className="text-base text-zinc-800 dark:text-zinc-200">{report.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-zinc-800 dark:text-zinc-200">
          <dt className="font-medium">Nearest landmark</dt>
          <dd>{report.location.address ?? "Not given"}</dd>
          <dt className="font-medium">Coordinates</dt>
          <dd className="font-mono">
            {report.location.lat.toFixed(5)}, {report.location.lng.toFixed(5)}
          </dd>
          <dt className="font-medium">Team</dt>
          <dd>{report.assignedTeam ? TEAM_LABELS[report.assignedTeam] : "Not assigned"}</dd>
        </dl>
        {report.photo && (
          <Image
            src={`/api/reports/${report.id}/photo`}
            alt={`Photo submitted with report ${report.id}`}
            width={1280}
            height={960}
            unoptimized
            className="h-auto w-full max-w-lg rounded-lg border border-zinc-200 dark:border-zinc-800"
          />
        )}
      </section>

      {report.analysis && (
        <section aria-labelledby="analysis-heading" className="flex flex-col gap-3">
          <h2
            id="analysis-heading"
            className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
          >
            Analysis
          </h2>
          <p className="text-base text-zinc-800 dark:text-zinc-200">
            <span className="font-medium">Summary: </span>
            {report.analysis.summary}
          </p>
          {report.analysis.suggestedCategory !== report.category && (
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              The analysis suggests {CATEGORY_LABELS[report.analysis.suggestedCategory]} for this
              report.
            </p>
          )}
          <h3 className="pt-2 text-base font-medium text-zinc-950 dark:text-zinc-50">
            Why this priority: score {report.analysis.priority.score} of 100
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            {report.analysis.priority.factors.map((factor) => (
              <li key={factor.factor}>
                <span className="font-medium">
                  {factor.factor} (+{factor.points}):
                </span>{" "}
                {factor.reason}
              </li>
            ))}
          </ul>
          {report.analysis.duplicateOf.length > 0 && (
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              Possibly the same problem as{" "}
              {report.analysis.duplicateOf.map((duplicateId, index) => (
                <span key={duplicateId}>
                  {index > 0 && ", "}
                  <Link
                    href={`/admin/reports/${duplicateId}`}
                    className="font-mono underline underline-offset-2"
                  >
                    {duplicateId}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
          <p className="text-xs text-zinc-700 dark:text-zinc-300">
            Summary and category: {report.analysis.method === "llm" ? "AI model" : "rules"}, from{" "}
            {new Date(report.analysis.analyzedAt).toISOString().slice(0, 10)}. The priority is
            recalculated from current reports each time this page loads.
          </p>
        </section>
      )}

      <section aria-labelledby="brief-heading" className="flex flex-col gap-3">
        <h2 id="brief-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Action brief
        </h2>
        <BriefView brief={brief} />
      </section>

      <section aria-labelledby="actions-heading" className="flex flex-col gap-4">
        <h2 id="actions-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Actions
        </h2>

        {!open ? (
          <p className="text-base text-zinc-800 dark:text-zinc-200">
            This report is closed or merged, so it cannot be changed.
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {canChangeTeam(report) && (
              <section aria-labelledby="team-heading" className="flex flex-col gap-3">
                <h3
                  id="team-heading"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
                >
                  Assign a team
                </h3>
                <AssignForm
                  reportId={report.id}
                  action={assignAction}
                  defaultTeam={report.assignedTeam ?? TEAM_FOR_CATEGORY[report.category]}
                />
              </section>
            )}

            {statusOptions.length > 0 && (
              <section aria-labelledby="status-heading" className="flex flex-col gap-3">
                <h3
                  id="status-heading"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
                >
                  Change status
                </h3>
                <StatusForm
                  reportId={report.id}
                  action={changeStatusAction}
                  options={statusOptions}
                />
              </section>
            )}

            <section aria-labelledby="category-heading" className="flex flex-col gap-3">
              <h3
                id="category-heading"
                className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Correct the category
              </h3>
              <CategoryForm
                reportId={report.id}
                action={changeCategoryAction}
                current={report.category}
              />
            </section>

            <section aria-labelledby="priority-heading" className="flex flex-col gap-3">
              <h3
                id="priority-heading"
                className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Set the priority
              </h3>
              <PriorityForm
                reportId={report.id}
                action={changePriorityAction}
                current={priority.level}
              />
            </section>

            {mergeTargets.length > 0 && (
              <section
                aria-labelledby="merge-heading"
                className="flex flex-col gap-3 md:col-span-2"
              >
                <h3
                  id="merge-heading"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
                >
                  Merge this duplicate
                </h3>
                <MergeForm
                  reportId={report.id}
                  action={mergeAction}
                  targets={mergeTargets}
                  suggestedId={suggestedTarget}
                />
              </section>
            )}
          </div>
        )}
      </section>

      {mergedHere.length > 0 && (
        <section aria-labelledby="merged-heading" className="flex flex-col gap-3">
          <h2 id="merged-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Merged into this report
          </h2>
          <ul className="flex flex-col gap-1 text-base">
            {mergedHere.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/reports/${item.id}`}
                  className="font-mono underline underline-offset-2"
                >
                  {item.id}
                </Link>{" "}
                <span className="text-zinc-800 dark:text-zinc-200">
                  {CATEGORY_LABELS[item.category]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          History
        </h2>
        <HistoryList entries={report.history} />
      </section>
    </main>
  );
}
