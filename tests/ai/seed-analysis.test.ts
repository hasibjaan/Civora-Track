import { describe, expect, it } from "vitest";

import { analyzeReport } from "@/ai/analyze";
import { SEED_REFERENCE_TIME, buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";
import type { Report } from "@/domain/types";

/**
 * Runs the real analysis over the demo data. These are the claims the demo makes, so they
 * are checked here: duplicates found, false matches avoided, safety issues ranked urgent.
 */
describe("analysis of the seed data", () => {
  const reports: Report[] = buildSeedReports();

  async function analyzeAll(): Promise<Map<string, Awaited<ReturnType<typeof analyzeReport>>>> {
    const results = new Map<string, Awaited<ReturnType<typeof analyzeReport>>>();
    for (const report of reports) {
      const others = reports.filter((other) => other.id !== report.id);
      const analysis = await analyzeReport(
        {
          description: report.description,
          category: report.category,
          location: report.location,
          reportedAt: new Date(report.reportedAt),
        },
        others,
        SEED_REFERENCE_TIME,
        null,
      );
      results.set(report.id, analysis);
    }
    return results;
  }

  it("links each deliberate duplicate to every other report in its group, and nothing else", async () => {
    const analyses = await analyzeAll();

    for (const spec of SEED_SPECS) {
      const groupMates = SEED_SPECS.filter(
        (other) => other.id !== spec.id && other.duplicateGroup === spec.duplicateGroup,
      ).map((other) => other.id);
      const found = analyses.get(spec.id)?.duplicateOf ?? [];

      if (spec.duplicateGroup) {
        expect([...found].sort(), spec.id).toEqual([...groupMates].sort());
      } else {
        expect(found, spec.id).toEqual([]);
      }
    }
  });

  it("ranks the four urgent safety reports as urgent", async () => {
    const analyses = await analyzeAll();

    for (const id of ["RPT-1015", "RPT-1016", "RPT-1017", "RPT-1018"]) {
      expect(analyses.get(id)?.priority.level, id).toBe("urgent");
    }
  });

  it("does not rank an ordinary routine report as urgent", async () => {
    const analyses = await analyzeAll();

    expect(analyses.get("RPT-1035")?.priority.level).not.toBe("urgent");
  });
});
