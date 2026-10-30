import { describe, expect, it, vi } from "vitest";

import { buildCitizenView } from "@/application/citizen-view";
import { submitReport, type SubmitDeps } from "@/application/submit-report";
import type { HistoryEntry, NewReport, Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const T = "2026-10-30T09:00:00.000Z";
const DETAILS: NewReport = {
  description: "Streetlight near the bus stop has been off for three nights.",
  category: "streetlight",
  location: { lat: 12.9716, lng: 77.5946, address: "Bus stop, Main Road" },
};

describe("citizen view notes", () => {
  it("hides an internal note written on a status change that is not a rejection", () => {
    const report = withHistory(makeReport({ id: "RPT-0000E001", status: "in_progress" }), [
      { type: "created", at: T, actor: "citizen" },
      {
        type: "status_changed",
        at: T,
        actor: "officer",
        from: "assigned",
        to: "in_progress",
        note: "Contractor overbooked, budget overrun likely.",
      },
    ]);

    const view = buildCitizenView(report, undefined);

    expect(JSON.stringify(view)).not.toContain("Contractor overbooked");
  });

  it("shows the reason when a report is rejected", () => {
    const report = withHistory(makeReport({ id: "RPT-0000E002", status: "rejected" }), [
      { type: "created", at: T, actor: "citizen" },
      {
        type: "status_changed",
        at: T,
        actor: "officer",
        from: "submitted",
        to: "rejected",
        note: "Outside the council's responsibility.",
      },
    ]);

    expect(buildCitizenView(report, undefined).timeline.at(-1)?.text).toContain(
      "Outside the council's responsibility.",
    );
  });
});

describe("submission cleanup", () => {
  function deps(overrides: Partial<SubmitDeps>): SubmitDeps {
    return {
      reports: {
        list: async () => [],
        create: async (report: Report) => report,
      },
      photos: {
        save: vi.fn(async () => ({ mimeType: "image/jpeg" as const })),
        remove: vi.fn(async () => undefined),
      },
      analyze: async () => {
        throw new Error("analysis crashed");
      },
      createId: () => "RPT-0000F001",
      now: () => new Date(T),
      ...overrides,
    };
  }

  it("removes the stored photo when analysis fails after the photo was saved", async () => {
    const submitDeps = deps({});

    await expect(
      submitReport({ ...DETAILS, imageUrl: "data:image/jpeg;base64,AAAA" }, submitDeps),
    ).rejects.toThrow("analysis crashed");
    expect(submitDeps.photos.remove).toHaveBeenCalledWith("RPT-0000F001");
  });
});

function withHistory(report: Report, history: HistoryEntry[]): Report {
  return { ...report, history };
}
