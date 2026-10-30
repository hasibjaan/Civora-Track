import { describe, expect, it } from "vitest";

import { CATEGORY_IDS, ReportSchema } from "@/domain/schemas";
import { canTransition } from "@/domain/status";
import type { Report } from "@/domain/types";
import { SEED_REFERENCE_TIME, buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";

describe("seed data", () => {
  const reports: Report[] = buildSeedReports();

  it("contains 40 reports with unique IDs", () => {
    expect(reports).toHaveLength(40);
    expect(new Set(reports.map((report) => report.id)).size).toBe(40);
  });

  it("is deterministic across calls", () => {
    expect(buildSeedReports()).toEqual(buildSeedReports());
  });

  it("produces reports that pass the stored-report schema", () => {
    for (const report of reports) {
      expect(ReportSchema.safeParse(report).success, report.id).toBe(true);
    }
  });

  it("covers every category", () => {
    const used = new Set(reports.map((report) => report.category));

    expect([...used].sort()).toEqual([...CATEGORY_IDS].sort());
  });

  it("never reports a time after the reference time", () => {
    for (const report of reports) {
      expect(new Date(report.reportedAt).getTime(), report.id).toBeLessThanOrEqual(
        SEED_REFERENCE_TIME.getTime(),
      );
      for (const entry of report.history) {
        expect(new Date(entry.at).getTime(), report.id).toBeLessThanOrEqual(
          SEED_REFERENCE_TIME.getTime(),
        );
      }
    }
  });

  it("has a history that is valid under the workflow and ends at the current status", () => {
    for (const report of reports) {
      const changes = report.history.flatMap((entry) =>
        entry.type === "status_changed" ? [entry] : [],
      );

      for (const change of changes) {
        expect(canTransition(change.from, change.to), `${report.id}: ${change.from}->${change.to}`)
          .toBe(true);
      }

      const lastStatus = changes.at(-1)?.to ?? "submitted";
      expect(lastStatus, report.id).toBe(report.status);
    }
  });

  it("includes three duplicate groups with at least two reports each", () => {
    const groups = new Map<string, number>();
    for (const spec of SEED_SPECS) {
      if (spec.duplicateGroup) {
        groups.set(spec.duplicateGroup, (groups.get(spec.duplicateGroup) ?? 0) + 1);
      }
    }

    expect(groups.size).toBe(3);
    for (const [group, count] of groups) {
      expect(count, group).toBeGreaterThanOrEqual(2);
    }
  });

  it("includes the four urgent safety reports", () => {
    const urgentIds = ["RPT-1015", "RPT-1016", "RPT-1017", "RPT-1018"];

    for (const id of urgentIds) {
      expect(reports.some((report) => report.id === id), id).toBe(true);
    }
  });
});
