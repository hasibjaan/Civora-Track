import { isOpenReport } from "./open-reports";
import { levelRank } from "./priority";
import type { PriorityLevel, Report } from "./types";

export interface ReportPriority {
  score: number;
  level: PriorityLevel;
}

/** A report's priority. An officer's level wins over the calculated one. */
export function priorityOf(report: Report): ReportPriority {
  const score = report.analysis?.priority.score ?? 0;
  const level = report.priorityOverride?.level ?? report.analysis?.priority.level ?? "low";
  return { score, level };
}

/**
 * Open reports, most urgent first. The level decides first, so an officer's override is
 * honoured, then the score. Ties go to the report that has waited longest, then to the
 * lower ID, so the order is always the same for the same data.
 */
export function rankQueue(reports: readonly Report[]): Report[] {
  return reports.filter(isOpenReport).sort((a, b) => {
    const first = priorityOf(a);
    const second = priorityOf(b);
    return (
      levelRank(second.level) - levelRank(first.level) ||
      second.score - first.score ||
      Date.parse(a.reportedAt) - Date.parse(b.reportedAt) ||
      a.id.localeCompare(b.id)
    );
  });
}
