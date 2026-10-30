import { buildAnalysis } from "@/ai/analyze";
import { buildReport } from "@/domain/report";
import { assignTeam } from "@/domain/officer-actions";
import { changeStatus } from "@/domain/status";
import { TEAM_FOR_CATEGORY } from "@/domain/teams";
import type { Report, Status } from "@/domain/types";

import { SEED_SPECS, type SeedSpec } from "./seed-data";

/** Fixed "now" so the seed is identical on every run. */
export const SEED_REFERENCE_TIME = new Date("2026-10-30T03:30:00.000Z");

/** Status steps each seeded report takes from submission to its final status. */
const PATH_TO_STATUS: Record<Status, readonly Status[]> = {
  submitted: [],
  triaged: ["triaged"],
  assigned: ["triaged", "assigned"],
  in_progress: ["triaged", "assigned", "in_progress"],
  resolved: ["triaged", "assigned", "in_progress", "resolved"],
  rejected: ["rejected"],
};

const HOURS_BETWEEN_STEPS = 2;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Builds the demo reports, each with its analysis already attached, the same way a
 * submitted report would be analyzed (rules only, so no network is needed).
 * Pure and deterministic for a given reference time. The app passes the current time, so a
 * freshly seeded demo is always recent. Tests use the fixed default.
 */
export function buildSeedReports(
  specs: readonly SeedSpec[] = SEED_SPECS,
  referenceTime: Date = SEED_REFERENCE_TIME,
): Report[] {
  const reports = specs.map((spec) => toReport(spec, referenceTime));

  return reports.map((report) => ({
    ...report,
    analysis: buildAnalysis(
      {
        description: report.description,
        category: report.category,
        location: report.location,
        reportedAt: new Date(report.reportedAt),
      },
      reports.filter((other) => other.id !== report.id),
      referenceTime,
      null,
    ),
  }));
}

function toReport(spec: SeedSpec, referenceTime: Date): Report {
  const reportedAt = new Date(referenceTime.getTime() - spec.hoursAgo * MS_PER_HOUR);

  let report = buildReport(
    {
      description: spec.description,
      category: spec.category,
      location: { lat: spec.lat, lng: spec.lng, address: spec.address },
    },
    { id: spec.id, now: reportedAt },
  );

  PATH_TO_STATUS[spec.status].forEach((to, index) => {
    // Steps never land after the reference time, even for very recent reports.
    const stepTime = Math.min(
      reportedAt.getTime() + (index + 1) * HOURS_BETWEEN_STEPS * MS_PER_HOUR,
      referenceTime.getTime(),
    );
    const at = new Date(stepTime);
    // Reaching "assigned" always means a team was chosen, so the seed uses the same rule.
    const result =
      to === "assigned"
        ? assignTeam(report, TEAM_FOR_CATEGORY[spec.category], { actor: "officer", at })
        : changeStatus(report, to, "officer", at, to === "rejected" ? spec.note : undefined);

    if (!result.ok) {
      // Seed data is written by us, so a failure here is a programming error.
      throw new Error(`Invalid seed data for ${spec.id}: ${result.error}`);
    }
    report = result.report;
  });

  return report;
}
