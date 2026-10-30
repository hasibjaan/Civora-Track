import { describe, expect, it } from "vitest";

import { withCurrentPriorities } from "@/application/current-reports";
import { scorePriority } from "@/domain/priority";
import type { Analysis, Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const DAY = 24 * 60 * 60 * 1000;
const SUBMITTED = new Date("2026-10-28T10:00:00.000Z");

function withAnalysis(report: Report): Report {
  const priority = scorePriority({
    description: report.description,
    category: report.category,
    reportedAt: new Date(report.reportedAt),
    now: new Date(report.reportedAt),
    duplicateCount: 0,
    nearbyOpenCount: 0,
  });
  const analysis: Analysis = {
    summary: "Stored summary from submission.",
    suggestedCategory: report.category,
    priority,
    duplicateOf: [],
    method: "rules",
    analyzedAt: report.reportedAt,
  };
  return { ...report, analysis };
}

describe("withCurrentPriorities", () => {
  it("adds the time-open factor once a report has been open for a few days", () => {
    const report = withAnalysis(
      makeReport({ id: "RPT-0000A001", reportedAt: SUBMITTED.toISOString() }),
    );
    const threeDaysLater = new Date(SUBMITTED.getTime() + 3 * DAY);

    const [refreshed] = withCurrentPriorities([report], threeDaysLater);

    const age = refreshed?.analysis?.priority.factors.find(
      (factor) => factor.factor === "Time open",
    );
    expect(age?.points).toBe(3);
    expect(refreshed?.analysis?.priority.score).toBeGreaterThan(
      report.analysis?.priority.score ?? 0,
    );
  });

  it("gives the oldest report credit for a duplicate that arrives later", () => {
    const first = withAnalysis(
      makeReport({
        id: "RPT-0000B001",
        description: "Drain outside the gate is blocked with waste.",
        category: "drainage",
        reportedAt: SUBMITTED.toISOString(),
      }),
    );
    const later = withAnalysis(
      makeReport({
        id: "RPT-0000B002",
        description: "Blocked drain outside the gate, waste everywhere.",
        category: "drainage",
        reportedAt: new Date(SUBMITTED.getTime() + DAY).toISOString(),
      }),
    );

    const refreshed = withCurrentPriorities(
      [first, later],
      new Date(SUBMITTED.getTime() + 2 * DAY),
    );

    const oldest = refreshed.find((report) => report.id === "RPT-0000B001");
    expect(oldest?.analysis?.duplicateOf).toEqual(["RPT-0000B002"]);
    expect(
      oldest?.analysis?.priority.factors.some((factor) => factor.factor === "Repeated reports"),
    ).toBe(true);
  });

  it("keeps the stored summary and category, since only the priority is recalculated", () => {
    const report = withAnalysis(
      makeReport({ id: "RPT-0000C001", reportedAt: SUBMITTED.toISOString() }),
    );

    const [refreshed] = withCurrentPriorities([report], new Date(SUBMITTED.getTime() + DAY));

    expect(refreshed?.analysis?.summary).toBe("Stored summary from submission.");
  });

  it("leaves a report without an analysis unchanged", () => {
    const report = makeReport({ id: "RPT-0000D001" });

    expect(withCurrentPriorities([report], SUBMITTED)).toEqual([report]);
  });
});
