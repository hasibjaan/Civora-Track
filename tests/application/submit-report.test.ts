import { describe, expect, it, vi } from "vitest";

import { submitReport, type SubmitDeps } from "@/application/submit-report";
import type { Analysis, NewReport, Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const NOW = new Date("2026-10-30T10:00:00.000Z");
const ANALYSIS: Analysis = {
  summary: "Streetlight is out.",
  suggestedCategory: "streetlight",
  priority: { score: 15, level: "low", factors: [] },
  duplicateOf: [],
  method: "rules",
  analyzedAt: NOW.toISOString(),
};

const DETAILS: NewReport = {
  description: "Streetlight near the bus stop has been off for three nights.",
  category: "streetlight",
  location: { lat: 12.9716, lng: 77.5946, address: "Bus stop, Main Road" },
};

function fakeDeps(overrides: Partial<SubmitDeps> = {}) {
  const created: Report[] = [];
  const deps: SubmitDeps = {
    reports: {
      list: vi.fn(async () => [makeReport({ id: "RPT-0000AAAA" })]),
      create: vi.fn(async (report: Report) => {
        created.push(report);
        return report;
      }),
    },
    photos: {
      save: vi.fn(async () => ({ mimeType: "image/jpeg" as const })),
      remove: vi.fn(async () => undefined),
    },
    analyze: vi.fn(async () => ANALYSIS),
    createId: () => "RPT-0000BEEF",
    now: () => NOW,
    ...overrides,
  };
  return { deps, created };
}

describe("submitReport", () => {
  it("saves a report with its analysis and no photo when none is attached", async () => {
    const { deps, created } = fakeDeps();

    const report = await submitReport(DETAILS, deps);

    expect(report).toMatchObject({ id: "RPT-0000BEEF", status: "submitted", analysis: ANALYSIS });
    expect(report.photo).toBeUndefined();
    expect(deps.photos.save).not.toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });

  it("stores the photo separately and records only its type on the report", async () => {
    const { deps } = fakeDeps();

    const report = await submitReport(
      { ...DETAILS, imageUrl: "data:image/jpeg;base64,AAAA" },
      deps,
    );

    expect(deps.photos.save).toHaveBeenCalledWith("RPT-0000BEEF", "data:image/jpeg;base64,AAAA");
    expect(report.photo).toEqual({ mimeType: "image/jpeg" });
    expect(report).not.toHaveProperty("imageUrl");
  });

  it("passes the existing reports to the analysis so duplicates can be found", async () => {
    const { deps } = fakeDeps();

    await submitReport(DETAILS, deps);

    expect(deps.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ category: "streetlight", reportedAt: NOW }),
      [expect.objectContaining({ id: "RPT-0000AAAA" })],
      NOW,
    );
  });

  it("removes the photo if the report cannot be saved, so no orphan file is left", async () => {
    const { deps } = fakeDeps({
      reports: {
        list: async () => [],
        create: async () => {
          throw new Error("disk full");
        },
      },
    });

    await expect(
      submitReport({ ...DETAILS, imageUrl: "data:image/png;base64,AAAA" }, deps),
    ).rejects.toThrow("disk full");
    expect(deps.photos.remove).toHaveBeenCalledWith("RPT-0000BEEF");
  });
});
