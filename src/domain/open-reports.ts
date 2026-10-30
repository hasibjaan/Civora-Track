import { distanceMeters, type Point } from "./geo";
import type { Report } from "./types";

const CLOSED_STATUSES = new Set<Report["status"]>(["resolved", "rejected"]);

/** How far around a report to look for other open problems (the "area" around it). */
export const NEARBY_RADIUS_METERS = 150;

/** A report still needs work: not resolved, not rejected, and not merged into another report. */
export function isOpenReport(report: Report): boolean {
  return !CLOSED_STATUSES.has(report.status) && report.mergedInto === undefined;
}

export function countNearbyOpenReports(
  point: Point,
  reports: readonly Report[],
  radiusMeters: number,
): number {
  return reports.filter(
    (report) => isOpenReport(report) && distanceMeters(point, report.location) <= radiusMeters,
  ).length;
}
