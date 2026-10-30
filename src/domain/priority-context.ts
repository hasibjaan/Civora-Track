import type { Point } from "./geo";
import { findDuplicates, type DuplicateMatch } from "./duplicates";
import { countNearbyOpenReports, NEARBY_RADIUS_METERS } from "./open-reports";
import type { Category, Report } from "./types";

/** The parts of a report that other reports can change. */
export interface ReportSubject {
  description: string;
  category: Category;
  location: Point;
  reportedAt: Date;
}

/** What a report's priority depends on in the other reports. */
export interface PriorityContext {
  duplicates: DuplicateMatch[];
  /** Open problems nearby, not counting the duplicates, which are scored separately. */
  nearbyOpenCount: number;
}

/**
 * Works out the duplicates and nearby problems for a report, from the other reports.
 * Used both when a report is first analyzed and whenever priorities are shown, so the
 * two always agree.
 */
export function priorityContext(
  subject: ReportSubject,
  others: readonly Report[],
): PriorityContext {
  const duplicates = findDuplicates(subject, others);
  const nearby = countNearbyOpenReports(subject.location, others, NEARBY_RADIUS_METERS);

  // A duplicate is an open report within the nearby radius, so it is already in the count.
  return { duplicates, nearbyOpenCount: nearby - duplicates.length };
}
