import { CATEGORY_LABELS } from "@/domain/categories";
import { PRIORITY_LABELS } from "@/domain/priority";
import { STATUS_LABELS } from "@/domain/status";
import { TEAM_LABELS } from "@/domain/teams";
import type { HistoryEntry } from "@/domain/types";

/** Plain-language description of one history entry. Used by the officer and citizen views. */
export function describeHistoryEntry(entry: HistoryEntry): string {
  switch (entry.type) {
    case "created":
      return "Report received";
    case "status_changed": {
      const change = `Status changed from ${STATUS_LABELS[entry.from]} to ${STATUS_LABELS[entry.to]}`;
      return entry.note ? `${change}. ${entry.note}` : change;
    }
    case "team_assigned":
      return `Assigned to the ${TEAM_LABELS[entry.team]}`;
    case "category_changed":
      return `Category changed from ${CATEGORY_LABELS[entry.from]} to ${CATEGORY_LABELS[entry.to]}`;
    case "priority_overridden":
      return `Priority set to ${PRIORITY_LABELS[entry.level]}. ${entry.reason}`;
    case "merged_into":
      return `Merged into report ${entry.primaryId}`;
  }
}
