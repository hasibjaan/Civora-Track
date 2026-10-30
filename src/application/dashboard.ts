import { CATEGORY_LABELS } from "@/domain/categories";
import { withCurrentPriorities } from "./current-reports";
import { describeHotspot, findHotspots, type Hotspot } from "@/domain/clustering";
import type { Point } from "@/domain/geo";
import { isOpenReport } from "@/domain/open-reports";
import { priorityOf, rankQueue } from "@/domain/queue";
import { mostUrgentLevel } from "@/domain/priority";
import type { PriorityLevel, Report } from "@/domain/types";

export interface DashboardStats {
  open: number;
  urgent: number;
  /** Open reports that match another open report, so they are candidates for merging. */
  repeated: number;
  hotspots: number;
}

export interface HotspotView {
  id: string;
  title: string;
  description: string;
  level: PriorityLevel;
  reportIds: string[];
  center: Point;
  /** Radius to draw on the map, with room around the furthest report. */
  radiusMeters: number;
  kind: "mixed" | "recurring";
  spreadMeters: number;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  level: PriorityLevel;
  title: string;
}

export interface Dashboard {
  stats: DashboardStats;
  queue: Report[];
  hotspots: HotspotView[];
  markers: MapMarker[];
}

const MIN_AREA_RADIUS_METERS = 60;
const AREA_PADDING_METERS = 30;

/** Turns stored reports into what the officer dashboard shows. Pure, so it is easy to test. */
export function buildDashboard(reports: readonly Report[], now: Date): Dashboard {
  const open = withCurrentPriorities(reports, now).filter(isOpenReport);
  const queue = rankQueue(open);
  const hotspots = findHotspots(open);
  const reportsById = new Map(open.map((report) => [report.id, report]));

  return {
    stats: {
      open: open.length,
      urgent: queue.filter((report) => priorityOf(report).level === "urgent").length,
      repeated: open.filter((report) => (report.analysis?.duplicateOf.length ?? 0) > 0).length,
      hotspots: hotspots.length,
    },
    queue,
    hotspots: hotspots.map((hotspot) => toHotspotView(hotspot, reportsById)),
    markers: queue.map((report) => ({
      id: report.id,
      lat: report.location.lat,
      lng: report.location.lng,
      level: priorityOf(report).level,
      title: `${CATEGORY_LABELS[report.category]} (${report.id})`,
    })),
  };
}

function toHotspotView(hotspot: Hotspot, reportsById: ReadonlyMap<string, Report>): HotspotView {
  const members = hotspot.reportIds.flatMap((id) => reportsById.get(id) ?? []);

  return {
    id: hotspot.id,
    title: `Hotspot: ${hotspot.reportIds.length} open reports`,
    description: describeHotspot(hotspot),
    level: mostUrgentLevel(members.map((report) => priorityOf(report).level)),
    reportIds: hotspot.reportIds,
    center: hotspot.center,
    radiusMeters: Math.max(MIN_AREA_RADIUS_METERS, hotspot.spreadMeters + AREA_PADDING_METERS),
    kind: hotspot.kind,
    spreadMeters: hotspot.spreadMeters,
  };
}
