import { describe, expect, it } from "vitest";

import { assignTeam, moveStatus, type ActionContext } from "@/domain/officer-actions";
import { priorityOf, rankQueue } from "@/domain/queue";
import { mostUrgentLevel } from "@/domain/priority";
import { contentWords } from "@/domain/text";
import type { Analysis } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const CONTEXT: ActionContext = { actor: "officer", at: new Date("2026-10-30T10:00:00.000Z") };

function analysed(score: number, level: Analysis["priority"]["level"]): Analysis {
  return {
    summary: "Summary",
    suggestedCategory: "other",
    priority: { score, level, factors: [] },
    duplicateOf: [],
    method: "rules",
    analyzedAt: "2026-10-30T10:00:00.000Z",
  };
}

describe("queue order honours an officer's priority", () => {
  it("puts an overridden urgent report above a low-scoring report that has a higher score", () => {
    const overridden = makeReport({
      id: "RPT-0000A001",
      analysis: analysed(12, "low"),
      priorityOverride: { level: "urgent", reason: "Escalated by the duty officer." },
    });
    const calculatedLow = makeReport({ id: "RPT-0000A002", analysis: analysed(30, "low") });

    expect(rankQueue([calculatedLow, overridden]).map((report) => report.id)).toEqual([
      "RPT-0000A001",
      "RPT-0000A002",
    ]);
    expect(priorityOf(overridden).level).toBe("urgent");
  });

  it("finds the most urgent level from a list of levels", () => {
    expect(mostUrgentLevel(["low", "high", "medium"])).toBe("high");
    expect(mostUrgentLevel([])).toBe("low");
  });
});

describe("merged and closed reports cannot be changed on the server", () => {
  const merged = makeReport({
    id: "RPT-0000B001",
    status: "submitted",
    mergedInto: "RPT-0000B002",
  });

  it("refuses to assign a team to a merged duplicate", () => {
    const result = assignTeam(merged, "roads", CONTEXT);

    expect(result.ok).toBe(false);
  });

  it("refuses to move a merged duplicate's status", () => {
    const result = moveStatus(merged, "triaged", undefined, CONTEXT);

    expect(result.ok).toBe(false);
  });
});

describe("stemming", () => {
  it("treats a four-letter plural as the same word as its singular", () => {
    expect(contentWords("bins")).toEqual(contentWords("bin"));
  });
});
