import { CATEGORY_LABELS } from "./categories";
import { distanceMeters, type Point } from "./geo";
import { isOpenReport, NEARBY_RADIUS_METERS } from "./open-reports";
import type { Category, Report } from "./types";

export interface HotspotOptions {
  /** Reports within this distance of each other belong to the same area. */
  radiusMeters: number;
  /** An area needs at least this many open reports to count as a hotspot. */
  minReports: number;
}

const DEFAULT_HOTSPOT_OPTIONS: HotspotOptions = {
  radiusMeters: NEARBY_RADIUS_METERS,
  minReports: 3,
};

export interface Hotspot {
  /** Stable for a given set of reports: the lowest report ID in the area. */
  id: string;
  /** Open reports in the area, sorted by ID. */
  reportIds: string[];
  center: Point;
  /** Distance from the centre to the furthest report in the area. */
  spreadMeters: number;
  /** Distinct categories reported in the area, sorted. */
  categories: Category[];
  /**
   * "mixed" when several kinds of problem appear together, which often points to a shared
   * cause such as a blocked drain. "recurring" when one kind keeps being reported.
   */
  kind: "mixed" | "recurring";
}

/**
 * Finds areas where open problems cluster together, using DBSCAN with a distance threshold.
 * Two reports are linked when they are within the radius. A chain of linked reports forms
 * one area, so a street with problems along its length is found as a single hotspot.
 * Closed and merged reports are ignored.
 */
export function findHotspots(
  reports: readonly Report[],
  options: HotspotOptions = DEFAULT_HOTSPOT_OPTIONS,
): Hotspot[] {
  const open = reports.filter(isOpenReport);
  const neighbours = open.map((report) =>
    open.flatMap((other, index) =>
      distanceMeters(report.location, other.location) <= options.radiusMeters ? [index] : [],
    ),
  );

  const visited = new Array<boolean>(open.length).fill(false);
  const inArea = new Array<boolean>(open.length).fill(false);
  const hotspots: Hotspot[] = [];

  for (let start = 0; start < open.length; start++) {
    if (visited[start] || neighbours[start].length < options.minReports) continue;

    visited[start] = true;
    const members: number[] = [];
    const addMember = (index: number) => {
      if (inArea[index]) return;
      inArea[index] = true;
      members.push(index);
    };

    addMember(start);
    const frontier = [...neighbours[start]];
    for (let next = frontier.pop(); next !== undefined; next = frontier.pop()) {
      if (!visited[next]) {
        visited[next] = true;
        // Only dense reports extend the area. Sparse ones are added as edges but not expanded.
        if (neighbours[next].length >= options.minReports) frontier.push(...neighbours[next]);
      }
      addMember(next);
    }

    if (members.length >= options.minReports) {
      hotspots.push(toHotspot(members.map((index) => open[index])));
    }
  }

  return hotspots;
}

/** A short, plain-language explanation of why an area is a hotspot. */
export function describeHotspot(hotspot: Hotspot): string {
  const count = hotspot.reportIds.length;
  const labels = hotspot.categories.map((category) => CATEGORY_LABELS[category]);
  const diameter = Math.round((hotspot.spreadMeters * 2) / 10) * 10;
  const area = `spread over about ${diameter} m`;

  const pattern =
    hotspot.kind === "mixed"
      ? `Several kinds of problem are reported together: ${joinWords(labels)}. They may share a cause.`
      : `The same kind of problem keeps being reported here: ${labels[0] ?? "problem"}.`;

  return `${count} open reports ${area}. ${pattern}`;
}

function toHotspot(members: readonly Report[]): Hotspot {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const center = {
    lat: average(members.map((report) => report.location.lat)),
    lng: average(members.map((report) => report.location.lng)),
  };
  const categories = [...new Set(members.map((report) => report.category))].sort();

  return {
    id: `hotspot-${sorted[0].id}`,
    reportIds: sorted.map((report) => report.id),
    center,
    spreadMeters: Math.max(...members.map((report) => distanceMeters(center, report.location))),
    categories,
    kind: categories.length > 1 ? "mixed" : "recurring",
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
