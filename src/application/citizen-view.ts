import { CATEGORY_LABELS } from "@/domain/categories";
import { STATUS_LABELS } from "@/domain/status";
import { TEAM_LABELS } from "@/domain/teams";
import type { HistoryEntry, Report, Status } from "@/domain/types";

export interface TimelineItem {
  at: string;
  text: string;
}

/** Everything a citizen may see about their report. Internal scores and officer names are left out. */
export interface CitizenView {
  id: string;
  categoryLabel: string;
  statusLabel: string;
  nextStep: string;
  description: string;
  landmark: string | null;
  hasPhoto: boolean;
  lastUpdated: string;
  /** Oldest first. */
  timeline: TimelineItem[];
  /** Set when the report was merged into another. The other report's ID is never shown. */
  combinedWith: string | null;
}

const NEXT_STEP: Record<Status, string> = {
  submitted: "Our team is reviewing your report.",
  triaged: "Your report is being reviewed and will go to a team.",
  assigned: "A team has your report and will start work soon.",
  in_progress: "Work on this problem is under way.",
  resolved:
    "This problem has been marked as resolved. If it is still there, please report it again.",
  rejected: "We could not act on this report. The reason is in the timeline above.",
};

/**
 * Builds the citizen's view of a report. A duplicate that was merged shows the progress of
 * the report it was merged into, without revealing that report's ID.
 */
export function buildCitizenView(report: Report, primary: Report | undefined): CitizenView {
  const tracked = report.mergedInto !== undefined && primary ? primary : report;

  return {
    id: report.id,
    categoryLabel: CATEGORY_LABELS[report.category],
    statusLabel: report.mergedInto ? combinedStatusLabel(primary) : STATUS_LABELS[report.status],
    nextStep: report.mergedInto ? NEXT_STEP[tracked.status] : NEXT_STEP[report.status],
    description: report.description,
    landmark: report.location.address ?? null,
    hasPhoto: report.photo !== undefined,
    lastUpdated: report.history.reduce(
      (latest, entry) => (entry.at > latest ? entry.at : latest),
      report.reportedAt,
    ),
    timeline: report.history.flatMap((entry) => {
      const text = describeForCitizen(entry);
      return text === null ? [] : [{ at: entry.at, text }];
    }),
    combinedWith: report.mergedInto ? "Combined with a similar report" : null,
  };
}

function combinedStatusLabel(primary: Report | undefined): string {
  return primary
    ? `Combined with a similar report: ${STATUS_LABELS[primary.status]}`
    : "Combined with a similar report";
}

/** Returns the citizen-facing wording for an entry, or null if the entry is internal. */
function describeForCitizen(entry: HistoryEntry): string | null {
  switch (entry.type) {
    case "created":
      return "Report received";
    case "status_changed":
      // Only a rejection reason is written for the citizen. Other notes are internal.
      return entry.note && entry.to === "rejected"
        ? `Status changed to ${STATUS_LABELS[entry.to]}. ${entry.note}`
        : `Status changed to ${STATUS_LABELS[entry.to]}`;
    case "team_assigned":
      return `Assigned to the ${TEAM_LABELS[entry.team]}`;
    case "category_changed":
      return `Category corrected to ${CATEGORY_LABELS[entry.to]}`;
    case "merged_into":
      return "Combined with a similar report, so work is tracked there";
    case "priority_overridden":
      // Priority is an internal decision, so it is not shown to citizens.
      return null;
  }
}
