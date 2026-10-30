import { describe, expect, it } from "vitest";

import { buildSeedReports } from "@/data/seed";

describe("seed assignments", () => {
  const reports = buildSeedReports();

  it("gives every report past triage a team, and records the assignment in its history", () => {
    const withWork = reports.filter((report) =>
      ["assigned", "in_progress", "resolved"].includes(report.status),
    );

    expect(withWork.length).toBeGreaterThan(0);
    for (const report of withWork) {
      expect(report.assignedTeam, report.id).toBeDefined();
      expect(report.history.some((entry) => entry.type === "team_assigned"), report.id).toBe(true);
    }
  });

  it("leaves reports that have not been assigned without a team", () => {
    const unassigned = reports.filter((report) => ["submitted", "triaged"].includes(report.status));

    for (const report of unassigned) {
      expect(report.assignedTeam, report.id).toBeUndefined();
    }
  });
});
