import { describe, expect, it } from "vitest";

import { buildCitizenView } from "@/application/citizen-view";
import type { HistoryEntry, Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const T = (hour: number) => `2026-10-30T${String(hour).padStart(2, "0")}:00:00.000Z`;

function withHistory(report: Report, history: HistoryEntry[]): Report {
  return { ...report, history };
}

describe("buildCitizenView", () => {
  it("shows the report, its status, and what happens next", () => {
    const report = makeReport({ id: "RPT-0000A001", status: "triaged" });

    const view = buildCitizenView(report, undefined);

    expect(view.statusLabel).toBe("Under review");
    expect(view.nextStep).toContain("will go to a team");
    expect(view.categoryLabel).toBe("Waterlogging");
  });

  it("lists progress oldest first, with plain wording for each change", () => {
    const report = withHistory(makeReport({ id: "RPT-0000A002" }), [
      { type: "created", at: T(8), actor: "citizen" },
      { type: "status_changed", at: T(9), actor: "officer", from: "submitted", to: "triaged" },
      { type: "team_assigned", at: T(10), actor: "officer", team: "drainage" },
    ]);

    const view = buildCitizenView(report, undefined);

    expect(view.timeline.map((item) => item.text)).toEqual([
      "Report received",
      "Status changed to Under review",
      "Assigned to the Drainage team (mock)",
    ]);
  });

  it("shows a rejection reason, because the citizen needs to know why", () => {
    const report = withHistory(makeReport({ id: "RPT-0000A003", status: "rejected" }), [
      { type: "created", at: T(8), actor: "citizen" },
      {
        type: "status_changed",
        at: T(9),
        actor: "officer",
        from: "submitted",
        to: "rejected",
        note: "This is a private land matter.",
      },
    ]);

    const view = buildCitizenView(report, undefined);

    expect(view.timeline.at(-1)?.text).toBe(
      "Status changed to Not actionable. This is a private land matter.",
    );
  });

  it("keeps internal decisions off the citizen's page", () => {
    const report = withHistory(makeReport({ id: "RPT-0000A004" }), [
      { type: "created", at: T(8), actor: "citizen" },
      {
        type: "priority_overridden",
        at: T(9),
        actor: "officer",
        level: "urgent",
        reason: "Internal escalation note.",
      },
    ]);

    const view = buildCitizenView(report, undefined);

    expect(view.timeline).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain("Internal escalation");
  });

  it("never reveals officer names, the calculated score, or coordinates", () => {
    const report = withHistory(
      makeReport({
        id: "RPT-0000A005",
        location: { lat: 12.97123, lng: 77.59456, address: "Gate" },
      }),
      [
        { type: "created", at: T(8), actor: "citizen" },
        { type: "team_assigned", at: T(9), actor: "officer.jane", team: "roads" },
      ],
    );

    const serialised = JSON.stringify(buildCitizenView(report, undefined));

    expect(serialised).not.toContain("officer.jane");
    expect(serialised).not.toContain("12.97123");
    expect(serialised).not.toContain("score");
  });

  it("shows a merged report's progress without revealing the report it was merged into", () => {
    const primary = makeReport({ id: "RPT-0000A006", status: "in_progress" });
    const duplicate = withHistory(
      { ...makeReport({ id: "RPT-0000A007" }), mergedInto: "RPT-0000A006" },
      [
        { type: "created", at: T(8), actor: "citizen" },
        { type: "merged_into", at: T(9), actor: "officer", primaryId: "RPT-0000A006" },
      ],
    );

    const view = buildCitizenView(duplicate, primary);

    expect(view.statusLabel).toBe("Combined with a similar report: Work in progress");
    expect(view.nextStep).toContain("under way");
    expect(JSON.stringify(view)).not.toContain("RPT-0000A006");
  });

  it("reports the most recent change as the last update time", () => {
    const report = withHistory(makeReport({ id: "RPT-0000A008" }), [
      { type: "created", at: T(8), actor: "citizen" },
      { type: "status_changed", at: T(15), actor: "officer", from: "submitted", to: "triaged" },
    ]);

    expect(buildCitizenView(report, undefined).lastUpdated).toBe(T(15));
  });
});
