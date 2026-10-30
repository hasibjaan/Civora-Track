import { describe, expect, it } from "vitest";

import {
  BriefContentSchema,
  templateBrief,
  urgencyFor,
  type BriefFacts,
  type BriefReportFact,
} from "@/domain/brief";

function fact(overrides: Partial<BriefReportFact> & Pick<BriefReportFact, "id">): BriefReportFact {
  return {
    category: "drainage",
    summary: "Drain outside the gate is blocked.",
    address: "14 Lakeview Road",
    level: "high",
    score: 40,
    ageDays: 2,
    reasons: ["Category impact: drains affect a wide area."],
    dangerous: false,
    ...overrides,
  };
}

describe("templateBrief for a single report", () => {
  it("names the problem and place in the headline and uses the summary as the issue", () => {
    const brief = templateBrief({ subject: "report", reports: [fact({ id: "RPT-0000A001" })] });

    expect(brief.headline).toBe("Blocked or open drain at 14 Lakeview Road");
    expect(brief.issue).toBe("Drain outside the gate is blocked.");
  });

  it("puts the reasons and the age in the evidence, and never more than four items", () => {
    const brief = templateBrief({
      subject: "report",
      reports: [
        fact({
          id: "RPT-0000A002",
          reasons: ["one", "two", "three", "four", "five"],
          ageDays: 5,
        }),
      ],
    });

    expect(brief.evidence.length).toBeLessThanOrEqual(4);
    expect(brief.evidence).toContain("Open for 5 days");
  });

  it("puts a safety instruction first when the report describes an immediate danger", () => {
    const brief = templateBrief({
      subject: "report",
      reports: [fact({ id: "RPT-0000A003", dangerous: true, level: "urgent" })],
    });

    expect(brief.suggestedAction.startsWith("Make the site safe today.")).toBe(true);
    expect(brief.urgency).toBe("immediate");
  });
});

describe("templateBrief for a hotspot", () => {
  const hotspot: BriefFacts = {
    subject: "hotspot",
    kind: "mixed",
    spreadMeters: 45,
    reports: [
      fact({ id: "RPT-0000B001", category: "drainage", address: "Lakeview Road", ageDays: 4 }),
      fact({
        id: "RPT-0000B002",
        category: "waterlogging",
        address: "Lakeview junction",
        level: "medium",
      }),
      fact({
        id: "RPT-0000B003",
        category: "road_damage",
        address: "Lakeview Road",
        level: "low",
        ageDays: 1,
      }),
    ],
  };

  it("counts the reports and lists each kind of problem once", () => {
    const brief = templateBrief(hotspot);

    expect(brief.headline).toBe(
      "3 open reports in one area: Blocked or open drain, Waterlogging and Road damage",
    );
  });

  it("explains that mixed problems may share a cause, and uses the spread it was given", () => {
    const brief = templateBrief(hotspot);

    expect(brief.issue).toContain("may share a cause");
    expect(brief.issue).toContain("about 90 m");
  });

  it("points at the drains first when drainage or waterlogging is involved", () => {
    expect(templateBrief(hotspot).suggestedAction).toContain("Inspect the drains first");
  });

  it("reports the oldest report's age and the highest priority", () => {
    const brief = templateBrief(hotspot);

    expect(brief.evidence[0]).toBe("3 open reports; the oldest has been open 4 days");
    expect(brief.evidence[1]).toBe("Highest priority in the area: High");
  });

  it("names the reports where immediate danger was reported", () => {
    const brief = templateBrief({
      ...hotspot,
      reports: [...hotspot.reports, fact({ id: "RPT-0000B004", dangerous: true, level: "urgent" })],
    });

    expect(brief.evidence.join(" ")).toContain("Immediate danger reported at RPT-0000B004");
    expect(brief.suggestedAction.startsWith("Make the site safe today.")).toBe(true);
  });

  it("describes a recurring hotspot as one problem that keeps coming back", () => {
    const brief = templateBrief({
      subject: "hotspot",
      kind: "recurring",
      spreadMeters: 30,
      reports: [fact({ id: "RPT-0000C001", category: "road_damage" })],
    });

    expect(brief.issue).toContain("keeps being reported");
    expect(brief.suggestedAction).toContain("underlying cause");
  });
});

describe("template output", () => {
  it("always satisfies the brief schema, so it can be shown without checks", () => {
    const brief = templateBrief({
      subject: "hotspot",
      kind: "mixed",
      spreadMeters: 80,
      reports: Array.from({ length: 8 }, (_, index) =>
        fact({
          id: `RPT-0000D00${index}`,
          address: `A very long landmark description that keeps going and going ${index} `.repeat(
            4,
          ),
        }),
      ),
    });

    expect(BriefContentSchema.safeParse(brief).success).toBe(true);
  });
});

describe("urgencyFor", () => {
  it.each([
    ["urgent", "immediate"],
    ["high", "this_week"],
    ["medium", "routine"],
    ["low", "routine"],
  ] as const)("maps %s to %s", (level, urgency) => {
    expect(urgencyFor(level)).toBe(urgency);
  });
});
