import { describe, expect, it } from "vitest";

import { STATUS_IDS } from "@/domain/schemas";
import { allowedNextStatuses, canTransition, changeStatus } from "@/domain/status";
import type { Report, Status } from "@/domain/types";

// The workflow as the product defines it. Any change here should be a deliberate decision.
const ALLOWED_MOVES: ReadonlyArray<readonly [Status, Status]> = [
  ["submitted", "triaged"],
  ["submitted", "rejected"],
  ["triaged", "assigned"],
  ["triaged", "rejected"],
  ["assigned", "in_progress"],
  ["in_progress", "resolved"],
];

const AT = new Date("2026-10-30T10:00:00.000Z");

function reportWithStatus(status: Status): Report {
  return {
    id: "RPT-TEST0001",
    description: "Test report for the status workflow.",
    category: "other",
    location: { lat: 12.97, lng: 77.59 },
    status,
    reportedAt: "2026-10-29T10:00:00.000Z",
    history: [{ type: "created", at: "2026-10-29T10:00:00.000Z", actor: "citizen" }],
  };
}

describe("canTransition", () => {
  it.each(ALLOWED_MOVES)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it("forbids every move that is not in the allowed list", () => {
    const allowedKeys = new Set(ALLOWED_MOVES.map(([from, to]) => `${from}>${to}`));

    for (const from of STATUS_IDS) {
      for (const to of STATUS_IDS) {
        if (allowedKeys.has(`${from}>${to}`)) continue;
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(false);
      }
    }
  });

  it("treats resolved and rejected as terminal", () => {
    expect(allowedNextStatuses("resolved")).toEqual([]);
    expect(allowedNextStatuses("rejected")).toEqual([]);
  });

  it("does not allow skipping straight to resolved", () => {
    expect(canTransition("submitted", "resolved")).toBe(false);
  });
});

describe("changeStatus", () => {
  it("returns a new report with the status and a history entry appended", () => {
    const original = reportWithStatus("submitted");

    const result = changeStatus(original, "triaged", "officer-1", AT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.status).toBe("triaged");
    expect(result.report.history).toHaveLength(2);
    expect(result.report.history[1]).toEqual({
      type: "status_changed",
      at: AT.toISOString(),
      actor: "officer-1",
      from: "submitted",
      to: "triaged",
    });
  });

  it("does not mutate the input report", () => {
    const original = reportWithStatus("submitted");

    changeStatus(original, "triaged", "officer-1", AT);

    expect(original.status).toBe("submitted");
    expect(original.history).toHaveLength(1);
  });

  it("rejects an invalid move and explains why", () => {
    const result = changeStatus(reportWithStatus("submitted"), "resolved", "officer-1", AT);

    expect(result).toEqual({
      ok: false,
      error: 'Cannot move a report from "Submitted" to "Resolved".',
    });
  });

  it("blocks any change to a terminal report", () => {
    const result = changeStatus(reportWithStatus("resolved"), "in_progress", "officer-1", AT);

    expect(result.ok).toBe(false);
  });
});
