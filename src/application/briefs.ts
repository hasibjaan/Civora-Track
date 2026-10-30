import type { BriefFacts, BriefReportFact } from "@/domain/brief";
import { DANGER_FACTOR } from "@/domain/priority";
import { priorityOf } from "@/domain/queue";
import type { Report } from "@/domain/types";

import type { HotspotView } from "./dashboard";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Only the fields a brief may use. Contact details and other reports are never passed on. */
function toReportFact(report: Report, now: Date): BriefReportFact {
  const factors = report.analysis?.priority.factors ?? [];

  return {
    id: report.id,
    category: report.category,
    summary: report.analysis?.summary ?? report.description,
    address: report.location.address ?? null,
    level: priorityOf(report).level,
    score: priorityOf(report).score,
    ageDays: Math.max(0, Math.floor((now.getTime() - Date.parse(report.reportedAt)) / MS_PER_DAY)),
    reasons: factors.map((factor) => factor.reason),
    dangerous: factors.some((factor) => factor.factor === DANGER_FACTOR),
  };
}

export function reportFacts(report: Report, now: Date): BriefFacts {
  return { subject: "report", reports: [toReportFact(report, now)] };
}

/** The facts for a hotspot. `members` are the open reports in the area. */
export function hotspotFacts(
  hotspot: HotspotView,
  members: readonly Report[],
  now: Date,
): BriefFacts {
  return {
    subject: "hotspot",
    reports: members.map((report) => toReportFact(report, now)),
    kind: hotspot.kind,
    spreadMeters: Math.round(hotspot.spreadMeters),
  };
}
