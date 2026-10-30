import { describe, expect, it } from "vitest";

import {
  assignTeam,
  canChangeTeam,
  mergeInto,
  moveStatus,
  overrideCategory,
  overridePriority,
  type ActionContext,
} from "@/domain/officer-actions";
import type { Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const CONTEXT: ActionContext = { actor: "officer", at: new Date("2026-10-30T10:00:00.000Z") };

function expectOk(result: { ok: boolean; error?: string; report?: Report }): Report {
  if (!result.ok || !result.report) throw new Error(`expected success, got: ${result.error}`);
  return result.report;
}

function expectRefused(result: { ok: boolean; error?: string }): string {
  if (result.ok || !result.error) throw new Error("expected the change to be refused");
  return result.error;
}

describe("assignTeam", () => {
  it("triages and assigns a new report in one step, recording both moves", () => {
    const report = expectOk(assignTeam(makeReport({ id: "RPT-0000A001" }), "drainage", CONTEXT));

    expect(report.status).toBe("assigned");
    expect(report.assignedTeam).toBe("drainage");
    expect(report.history.map((entry) => entry.type)).toEqual([
      "created",
      "status_changed",
      "status_changed",
      "team_assigned",
    ]);
  });

  it("moves a triaged report to assigned", () => {
    const triaged = makeReport({ id: "RPT-0000A002", status: "triaged" });

    expect(expectOk(assignTeam(triaged, "roads", CONTEXT)).status).toBe("assigned");
  });

  it("lets an officer change the team before work starts, without changing the status", () => {
    const assigned = makeReport({ id: "RPT-0000A003", status: "assigned", assignedTeam: "roads" });

    const updated = expectOk(assignTeam(assigned, "water", CONTEXT));

    expect(updated.assignedTeam).toBe("water");
    expect(updated.status).toBe("assigned");
  });

  it("refuses once work has started, so the team cannot change under the people doing it", () => {
    const inProgress = makeReport({
      id: "RPT-0000A004",
      status: "in_progress",
      assignedTeam: "roads",
    });

    expect(expectRefused(assignTeam(inProgress, "water", CONTEXT))).toContain("Work has started");
  });

  it("refuses to assign the team that already has the report", () => {
    const assigned = makeReport({ id: "RPT-0000A005", status: "assigned", assignedTeam: "roads" });

    expect(expectRefused(assignTeam(assigned, "roads", CONTEXT))).toContain("already");
  });
});

describe("moveStatus", () => {
  it("moves an assigned report to work in progress once a team is set", () => {
    const assigned = makeReport({ id: "RPT-0000B001", status: "assigned", assignedTeam: "roads" });

    expect(expectOk(moveStatus(assigned, "in_progress", undefined, CONTEXT)).status).toBe(
      "in_progress",
    );
  });

  it("refuses to start work on a report that has no team", () => {
    const assigned = makeReport({ id: "RPT-0000B002", status: "triaged" });

    expect(expectRefused(moveStatus(assigned, "in_progress", undefined, CONTEXT))).toContain(
      "Assign a team",
    );
  });

  it("sends the officer to Assign instead of moving to assigned directly", () => {
    const triaged = makeReport({ id: "RPT-0000B003", status: "triaged" });

    expect(expectRefused(moveStatus(triaged, "assigned", undefined, CONTEXT))).toContain("Assign");
  });

  it("requires a reason to reject a report, and records it", () => {
    const submitted = makeReport({ id: "RPT-0000B004" });

    expect(expectRefused(moveStatus(submitted, "rejected", undefined, CONTEXT))).toContain(
      "reason",
    );

    const rejected = expectOk(moveStatus(submitted, "rejected", "Not a council matter.", CONTEXT));
    expect(rejected.status).toBe("rejected");
    expect(rejected.history.at(-1)).toMatchObject({ note: "Not a council matter." });
  });

  it("refuses a move the workflow does not allow, and says which move it was", () => {
    // An open report, so the closed-report rule passes and the workflow rule is the one that refuses.
    const submitted = makeReport({ id: "RPT-0000B005" });

    const error = expectRefused(moveStatus(submitted, "resolved", undefined, CONTEXT));
    expect(error).toContain("Submitted");
    expect(error).toContain("Resolved");
  });

  it("refuses a status change on a report that is already closed", () => {
    const rejected = makeReport({ id: "RPT-0000B006", status: "rejected" });

    expect(expectRefused(moveStatus(rejected, "triaged", undefined, CONTEXT))).toContain("closed");
  });
});

describe("canChangeTeam", () => {
  it.each([
    ["submitted", true],
    ["triaged", true],
    ["assigned", true],
    ["in_progress", false],
    ["resolved", false],
    ["rejected", false],
  ] as const)("is %s -> %s", (status, expected) => {
    expect(canChangeTeam(makeReport({ id: "RPT-0000C001", status }))).toBe(expected);
  });
});

describe("overrideCategory", () => {
  it("changes the category and records the old and new values", () => {
    const report = expectOk(
      overrideCategory(makeReport({ id: "RPT-0000D001", category: "other" }), "waste", CONTEXT),
    );

    expect(report.category).toBe("waste");
    expect(report.history.at(-1)).toMatchObject({
      type: "category_changed",
      from: "other",
      to: "waste",
    });
  });

  it("refuses the same category and refuses closed reports", () => {
    expect(
      expectRefused(overrideCategory(makeReport({ id: "RPT-0000D002" }), "waterlogging", CONTEXT)),
    ).toContain("already has this category");
    expect(
      expectRefused(
        overrideCategory(makeReport({ id: "RPT-0000D003", status: "resolved" }), "waste", CONTEXT),
      ),
    ).toContain("closed");
  });
});

describe("overridePriority", () => {
  it("sets the officer's priority with a reason, and keeps the calculated score", () => {
    const report = expectOk(
      overridePriority(
        makeReport({ id: "RPT-0000E001" }),
        "urgent",
        "Child-height wires.",
        CONTEXT,
      ),
    );

    expect(report.priorityOverride).toEqual({ level: "urgent", reason: "Child-height wires." });
    expect(report.history.at(-1)).toMatchObject({ type: "priority_overridden", level: "urgent" });
  });

  it("refuses a closed report", () => {
    expect(
      expectRefused(
        overridePriority(
          makeReport({ id: "RPT-0000E002", status: "rejected" }),
          "high",
          "x",
          CONTEXT,
        ),
      ),
    ).toContain("closed");
  });
});

describe("mergeInto", () => {
  const primary = makeReport({ id: "RPT-0000F001" });
  const duplicate = makeReport({ id: "RPT-0000F002" });

  it("marks the duplicate as merged and records where it went", () => {
    const merged = expectOk(mergeInto(duplicate, primary, CONTEXT));

    expect(merged.mergedInto).toBe("RPT-0000F001");
    expect(merged.history.at(-1)).toMatchObject({ type: "merged_into", primaryId: "RPT-0000F001" });
  });

  it("refuses to merge a report into itself", () => {
    expect(expectRefused(mergeInto(primary, primary, CONTEXT))).toContain("into itself");
  });

  it("refuses to merge into a report that is closed or already merged", () => {
    const closedPrimary = makeReport({ id: "RPT-0000F003", status: "resolved" });
    const mergedPrimary = makeReport({ id: "RPT-0000F004", mergedInto: "RPT-0000F001" });

    expect(expectRefused(mergeInto(duplicate, closedPrimary, CONTEXT))).toContain("open reports");
    expect(expectRefused(mergeInto(duplicate, mergedPrimary, CONTEXT))).toContain("open reports");
  });

  it("refuses to merge a report that is already merged", () => {
    const alreadyMerged = makeReport({ id: "RPT-0000F005", mergedInto: "RPT-0000F001" });

    expect(expectRefused(mergeInto(alreadyMerged, primary, CONTEXT))).toContain("open reports");
  });
});
