import { describe, expect, it } from "vitest";

import { describeHistoryEntry } from "@/application/history";
import type { HistoryEntry } from "@/domain/types";

const AT = "2026-10-30T10:00:00.000Z";

describe("describeHistoryEntry", () => {
  it.each<[HistoryEntry, string]>([
    [{ type: "created", at: AT, actor: "citizen" }, "Report received"],
    [
      { type: "status_changed", at: AT, actor: "officer", from: "triaged", to: "assigned" },
      "Status changed from Under review to Assigned to a team",
    ],
    [
      {
        type: "status_changed",
        at: AT,
        actor: "officer",
        from: "submitted",
        to: "rejected",
        note: "Not a council matter.",
      },
      "Status changed from Submitted to Not actionable. Not a council matter.",
    ],
    [
      { type: "team_assigned", at: AT, actor: "officer", team: "drainage" },
      "Assigned to the Drainage team (mock)",
    ],
    [
      { type: "category_changed", at: AT, actor: "officer", from: "other", to: "waste" },
      "Category changed from Other to Garbage and waste",
    ],
    [
      { type: "priority_overridden", at: AT, actor: "officer", level: "urgent", reason: "Wires." },
      "Priority set to Urgent. Wires.",
    ],
    [
      { type: "merged_into", at: AT, actor: "officer", primaryId: "RPT-0000AAAA" },
      "Merged into report RPT-0000AAAA",
    ],
  ])("describes %j", (entry, expected) => {
    expect(describeHistoryEntry(entry)).toBe(expected);
  });
});
