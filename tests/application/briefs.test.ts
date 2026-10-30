import { describe, expect, it } from "vitest";

import type { HotspotView } from "@/application/dashboard";
import { hotspotFacts, reportFacts } from "@/application/briefs";
import { DANGER_FACTOR } from "@/domain/priority";
import type { Analysis, Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const NOW = new Date("2026-10-30T10:00:00.000Z");

function analysed(overrides: Partial<Analysis["priority"]> = {}): Analysis {
  return {
    summary: "Live wire exposed near the school.",
    suggestedCategory: "streetlight",
    priority: {
      score: 70,
      level: "urgent",
      factors: [
        { factor: DANGER_FACTOR, points: 40, reason: 'Mentions "live wire".' },
        { factor: "Time open", points: 2, reason: "Open for 2 days." },
      ],
      ...overrides,
    },
    duplicateOf: [],
    method: "rules",
    analyzedAt: NOW.toISOString(),
  };
}

describe("reportFacts", () => {
  it("carries the report's facts, its age, and whether it is dangerous", () => {
    const report: Report = makeReport({
      id: "RPT-0000A001",
      category: "streetlight",
      reportedAt: "2026-10-28T10:00:00.000Z",
      location: { lat: 12.97, lng: 77.59, address: "Hill Road" },
      analysis: analysed(),
    });

    const facts = reportFacts(report, NOW);

    expect(facts.subject).toBe("report");
    expect(facts.reports[0]).toMatchObject({
      id: "RPT-0000A001",
      summary: "Live wire exposed near the school.",
      address: "Hill Road",
      level: "urgent",
      score: 70,
      ageDays: 2,
      dangerous: true,
    });
  });

  it("passes on only the fields a brief needs, never coordinates or other personal data", () => {
    const report = makeReport({
      id: "RPT-0000A002",
      location: { lat: 12.97123, lng: 77.59456 },
      analysis: analysed(),
    });

    const serialised = JSON.stringify(reportFacts(report, NOW));

    expect(serialised).not.toContain("12.97123");
    expect(serialised).not.toContain("history");
    expect(serialised).not.toContain("photo");
  });

  it("falls back to the description when the report has no analysis yet", () => {
    const report = makeReport({ id: "RPT-0000A003", description: "Pothole on the main road." });

    expect(reportFacts(report, NOW).reports[0]?.summary).toBe("Pothole on the main road.");
  });
});

describe("hotspotFacts", () => {
  it("includes every member report and the hotspot's shape", () => {
    const view: HotspotView = {
      id: "hotspot-RPT-0000B001",
      title: "Hotspot: 2 open reports",
      description: "",
      level: "urgent",
      reportIds: ["RPT-0000B001", "RPT-0000B002"],
      center: { lat: 12.97, lng: 77.59 },
      radiusMeters: 90,
      kind: "mixed",
      spreadMeters: 41.6,
    };
    const members = [
      makeReport({ id: "RPT-0000B001", analysis: analysed() }),
      makeReport({ id: "RPT-0000B002", category: "waste" }),
    ];

    const facts = hotspotFacts(view, members, NOW);

    expect(facts.subject).toBe("hotspot");
    expect(facts.kind).toBe("mixed");
    expect(facts.spreadMeters).toBe(42);
    expect(facts.reports.map((report) => report.id)).toEqual(["RPT-0000B001", "RPT-0000B002"]);
  });
});
