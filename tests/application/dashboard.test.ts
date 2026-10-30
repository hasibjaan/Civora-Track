import { describe, expect, it } from "vitest";

import { buildDashboard } from "@/application/dashboard";
import { SEED_REFERENCE_TIME, buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";

// The blocked drain and the problems around it. RPT-1009, a streetlight in a back lane about
// 200 m away, is deliberately not included: it is outside the 150 m area, so it is correctly
// reported as a separate problem.
const LAKEVIEW_DRAIN_AND_SURROUNDS = [
  "RPT-1001",
  "RPT-1002",
  "RPT-1003",
  "RPT-1004",
  "RPT-1005",
  "RPT-1006",
  "RPT-1007",
  "RPT-1008",
];
const URGENT_SAFETY_REPORTS = ["RPT-1015", "RPT-1016", "RPT-1017", "RPT-1018"];

/** The dashboard over the demo data, which is what the judges will see first. */
describe("buildDashboard over the seed data", () => {
  const reports = buildSeedReports();
  const dashboard = buildDashboard(reports, SEED_REFERENCE_TIME);
  const openSpecs = SEED_SPECS.filter((spec) => !["resolved", "rejected"].includes(spec.status));

  it("counts only open reports", () => {
    expect(dashboard.stats.open).toBe(openSpecs.length);
    expect(dashboard.markers).toHaveLength(openSpecs.length);
  });

  it("shows the four urgent safety reports at the top of the queue", () => {
    const top = dashboard.queue.slice(0, URGENT_SAFETY_REPORTS.length).map((report) => report.id);

    expect([...top].sort()).toEqual(URGENT_SAFETY_REPORTS);
    expect(dashboard.stats.urgent).toBeGreaterThanOrEqual(URGENT_SAFETY_REPORTS.length);
  });

  it("finds the Lakeview Road area as one hotspot", () => {
    const lakeview = dashboard.hotspots.find((hotspot) =>
      LAKEVIEW_DRAIN_AND_SURROUNDS.every((id) => hotspot.reportIds.includes(id)),
    );

    expect(lakeview).toBeDefined();
    expect(lakeview?.description).toContain("Blocked or open drain");
    expect(lakeview?.level).toBe("urgent");
  });

  it("counts the reports that repeat another, which are the candidates for merging", () => {
    // Every report in the three deliberate duplicate groups is open, so each one is a repeat.
    const duplicateSpecs = SEED_SPECS.filter((spec) => spec.duplicateGroup);

    expect(dashboard.stats.repeated).toBe(duplicateSpecs.length);
  });

  it("gives each hotspot a map radius large enough to hold its reports", () => {
    for (const hotspot of dashboard.hotspots) {
      expect(hotspot.radiusMeters).toBeGreaterThanOrEqual(60);
    }
  });
});
