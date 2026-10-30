import { describe, expect, it } from "vitest";

import { priorityOf, rankQueue } from "@/domain/queue";
import { mostUrgentLevel } from "@/domain/priority";
import type { Analysis } from "@/domain/types";
import { makeReport } from "../support/fixtures";

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

describe("rankQueue", () => {
  it("puts the highest score first", () => {
    const reports = [
      makeReport({ id: "RPT-0000A001", analysis: analysed(20, "medium") }),
      makeReport({ id: "RPT-0000A002", analysis: analysed(70, "urgent") }),
      makeReport({ id: "RPT-0000A003", analysis: analysed(40, "high") }),
    ];

    expect(rankQueue(reports).map((report) => report.id)).toEqual([
      "RPT-0000A002",
      "RPT-0000A003",
      "RPT-0000A001",
    ]);
  });

  it("breaks ties by who has waited longest, then by ID", () => {
    const older = makeReport({
      id: "RPT-0000B002",
      reportedAt: "2026-10-28T10:00:00.000Z",
      analysis: analysed(30, "high"),
    });
    const newer = makeReport({
      id: "RPT-0000B001",
      reportedAt: "2026-10-29T10:00:00.000Z",
      analysis: analysed(30, "high"),
    });

    expect(rankQueue([newer, older]).map((report) => report.id)).toEqual([
      "RPT-0000B002",
      "RPT-0000B001",
    ]);
  });

  it("leaves out closed reports", () => {
    const reports = [
      makeReport({ id: "RPT-0000C001", status: "resolved", analysis: analysed(90, "urgent") }),
      makeReport({ id: "RPT-0000C002", analysis: analysed(10, "low") }),
    ];

    expect(rankQueue(reports).map((report) => report.id)).toEqual(["RPT-0000C002"]);
  });

  it("does not modify the array it was given", () => {
    const reports = [
      makeReport({ id: "RPT-0000D002", analysis: analysed(10, "low") }),
      makeReport({ id: "RPT-0000D001", analysis: analysed(90, "urgent") }),
    ];
    const before = reports.map((report) => report.id);

    rankQueue(reports);

    expect(reports.map((report) => report.id)).toEqual(before);
  });
});

describe("priorityOf", () => {
  it("ranks a report without an analysis as low", () => {
    expect(priorityOf(makeReport({ id: "RPT-0000E001" }))).toEqual({ score: 0, level: "low" });
  });
});

describe("mostUrgentLevel", () => {
  it("returns the most urgent level present", () => {
    const reports = [
      makeReport({ id: "RPT-0000F001", analysis: analysed(10, "low") }),
      makeReport({ id: "RPT-0000F002", analysis: analysed(60, "urgent") }),
      makeReport({ id: "RPT-0000F003", analysis: analysed(40, "high") }),
    ];

    expect(mostUrgentLevel(reports.map((report) => priorityOf(report).level))).toBe("urgent");
  });

  it("returns low for an empty list", () => {
    expect(mostUrgentLevel([])).toBe("low");
  });
});
