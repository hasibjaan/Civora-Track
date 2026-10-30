import { describe, expect, it } from "vitest";

import { scorePriority, type PriorityInput } from "@/domain/priority";

const NOW = new Date("2026-10-30T10:00:00.000Z");

function input(overrides: Partial<PriorityInput> = {}): PriorityInput {
  return {
    description: "Pothole in the middle of the lane.",
    category: "other",
    reportedAt: NOW,
    now: NOW,
    duplicateCount: 0,
    nearbyOpenCount: 0,
    ...overrides,
  };
}

describe("scorePriority", () => {
  it("scores a routine report low and explains its one factor", () => {
    const result = scorePriority(input());

    expect(result.level).toBe("low");
    expect(result.factors.map((factor) => factor.factor)).toEqual(["Category impact"]);
    expect(result.score).toBe(5);
  });

  it("makes an exposed live wire urgent, and names the phrase that triggered it", () => {
    const result = scorePriority(
      input({
        description: "Exposed live wire hanging beside the primary school gate.",
        category: "streetlight",
      }),
    );

    expect(result.level).toBe("urgent");
    const danger = result.factors.find((factor) => factor.factor === "Immediate danger");
    expect(danger?.points).toBe(40);
    expect(danger?.reason).toContain("live wire");
  });

  it("makes a missing manhole cover urgent even with no other context", () => {
    const result = scorePriority(
      input({ description: "Manhole cover missing at the bus stop.", category: "drainage" }),
    );

    expect(result.level).toBe("urgent");
  });

  it("adds points for how long a report has been open, capped at 10", () => {
    const tenDaysOld = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
    const result = scorePriority(input({ reportedAt: tenDaysOld }));

    expect(result.factors.find((factor) => factor.factor === "Time open")?.points).toBe(10);
  });

  it("adds no age points for a report made today", () => {
    const result = scorePriority(input());

    expect(result.factors.some((factor) => factor.factor === "Time open")).toBe(false);
  });

  it("scores repeated and nearby reports, each with a capped point value", () => {
    const result = scorePriority(input({ duplicateCount: 9, nearbyOpenCount: 9 }));

    expect(result.factors.find((factor) => factor.factor === "Repeated reports")?.points).toBe(10);
    expect(
      result.factors.find((factor) => factor.factor === "Other open problems nearby")?.points,
    ).toBe(16);
  });

  it("sums the factor points to the score", () => {
    const result = scorePriority(
      input({
        description: "Urgent: flood water entering homes near the school.",
        category: "waterlogging",
        duplicateCount: 2,
        nearbyOpenCount: 1,
      }),
    );

    const total = result.factors.reduce((sum, factor) => sum + factor.points, 0);
    expect(result.score).toBe(Math.min(100, total));
  });

  it("never exceeds a score of 100", () => {
    const result = scorePriority(
      input({
        description:
          "URGENT live wire and flood water near the school and hospital, children at risk, dangerous.",
        category: "waterlogging",
        reportedAt: new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000),
        duplicateCount: 5,
        nearbyOpenCount: 5,
      }),
    );

    expect(result.score).toBe(100);
  });

  it("maps scores to levels at the documented thresholds", () => {
    // Category impact is the only factor here, so the score equals its points.
    expect(scorePriority(input({ category: "other" })).level).toBe("low");
    // Other (5) + four nearby reports (16) = 21, which is medium.
    expect(scorePriority(input({ nearbyOpenCount: 4 })).level).toBe("medium");
    // Waterlogging (20) + four nearby reports (16) = 36, which is high.
    expect(scorePriority(input({ category: "waterlogging", nearbyOpenCount: 4 })).level).toBe(
      "high",
    );
    // Drainage (20) + immediate danger (40) = 60, which is urgent.
    expect(
      scorePriority(input({ category: "drainage", description: "A sinkhole opened up here." }))
        .level,
    ).toBe("urgent");
  });

  it("is deterministic for the same input", () => {
    const first = scorePriority(input({ nearbyOpenCount: 2 }));
    const second = scorePriority(input({ nearbyOpenCount: 2 }));

    expect(second).toEqual(first);
  });
});
