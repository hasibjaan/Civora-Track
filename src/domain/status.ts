import type { ChangeResult } from "./changes";
import type { HistoryEntry, Report, Status } from "./types";

/**
 * The workflow in one place. Every status change in the app goes through
 * changeStatus(), so an invalid move cannot be saved by accident.
 */
const TRANSITIONS: Record<Status, readonly Status[]> = {
  submitted: ["triaged", "rejected"],
  triaged: ["assigned", "rejected"],
  assigned: ["in_progress"],
  in_progress: ["resolved"],
  resolved: [],
  rejected: [],
};

/** Citizen-facing wording for each status. */
export const STATUS_LABELS: Record<Status, string> = {
  submitted: "Submitted",
  triaged: "Under review",
  assigned: "Assigned to a team",
  in_progress: "Work in progress",
  resolved: "Resolved",
  rejected: "Not actionable",
};

export function allowedNextStatuses(from: Status): readonly Status[] {
  return TRANSITIONS[from];
}

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Returns a new report with the status changed and a history entry appended.
 * The input report is not mutated. A note, such as the reason for rejecting a report,
 * is recorded with the change.
 */
export function changeStatus(
  report: Report,
  to: Status,
  actor: string,
  at: Date,
  note?: string,
): ChangeResult {
  if (!canTransition(report.status, to)) {
    return {
      ok: false,
      error: `Cannot move a report from "${STATUS_LABELS[report.status]}" to "${STATUS_LABELS[to]}".`,
    };
  }

  const entry: HistoryEntry = {
    type: "status_changed",
    at: at.toISOString(),
    actor,
    from: report.status,
    to,
    note,
  };

  return {
    ok: true,
    report: { ...report, status: to, history: [...report.history, entry] },
  };
}
