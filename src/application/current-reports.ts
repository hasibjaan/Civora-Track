import { priorityContext } from "@/domain/priority-context";
import { scorePriority } from "@/domain/priority";
import type { Report } from "@/domain/types";

/**
 * Recalculates each report's priority and duplicate suggestions from the reports as they
 * are now. A report's age grows, and new duplicates and nearby problems arrive after it was
 * submitted, so a score frozen at submission goes stale. The stored analysis keeps the
 * original summary and category. Only the priority and the duplicate list are refreshed.
 * This runs for every page view, which is quadratic in the number of reports and fine for
 * the size this app is built for.
 */
export function withCurrentPriorities(reports: readonly Report[], now: Date): Report[] {
  return reports.map((report) => {
    if (!report.analysis) return report;

    const reportedAt = new Date(report.reportedAt);
    const others = reports.filter((other) => other.id !== report.id);
    const context = priorityContext(
      {
        description: report.description,
        category: report.category,
        location: report.location,
        reportedAt,
      },
      others,
    );
    const priority = scorePriority({
      description: report.description,
      category: report.category,
      reportedAt,
      now,
      duplicateCount: context.duplicates.length,
      nearbyOpenCount: context.nearbyOpenCount,
    });

    return {
      ...report,
      analysis: {
        ...report.analysis,
        priority,
        duplicateOf: context.duplicates.map((match) => match.reportId),
      },
    };
  });
}
