import { describe, expect, it } from "vitest";

import { NewReportSchema, ReportSchema } from "@/domain/schemas";
import { buildReport, createReportId } from "@/domain/report";
import type { NewReport } from "@/domain/types";

const NOW = new Date("2026-10-30T10:00:00.000Z");

const VALID_INPUT: NewReport = {
  description: "Streetlight near the bus stop has been off for three nights.",
  category: "streetlight",
  location: { lat: 12.9716, lng: 77.5946, address: "Bus stop, Main Road" },
};

describe("buildReport", () => {
  it("creates a submitted report with a created history entry", () => {
    const report = buildReport(VALID_INPUT, { id: "RPT-ABC12345", now: NOW });

    expect(report).toMatchObject({
      id: "RPT-ABC12345",
      status: "submitted",
      reportedAt: NOW.toISOString(),
      category: "streetlight",
      history: [{ type: "created", at: NOW.toISOString(), actor: "citizen" }],
    });
  });

  it("produces a report that passes the stored-report schema", () => {
    const report = buildReport(VALID_INPUT, { id: "RPT-ABC12345", now: NOW });

    expect(ReportSchema.safeParse(report).success).toBe(true);
  });
});

describe("createReportId", () => {
  it("creates a short, upper-case tracking ID", () => {
    expect(createReportId()).toMatch(/^RPT-[0-9A-F]{12}$/);
  });

  it("creates different IDs on each call", () => {
    expect(createReportId()).not.toBe(createReportId());
  });
});

describe("NewReportSchema", () => {
  it("accepts a valid submission", () => {
    expect(NewReportSchema.safeParse(VALID_INPUT).success).toBe(true);
  });

  it("rejects a description that is too short", () => {
    const result = NewReportSchema.safeParse({ ...VALID_INPUT, description: "Broken" });

    expect(result.success).toBe(false);
  });

  it("trims whitespace from the description before checking its length", () => {
    const result = NewReportSchema.safeParse({ ...VALID_INPUT, description: "   short    " });

    expect(result.success).toBe(false);
  });

  it("rejects coordinates outside the valid range", () => {
    const result = NewReportSchema.safeParse({
      ...VALID_INPUT,
      location: { lat: 120, lng: 77.59, address: "Bus stop" },
    });

    expect(result.success).toBe(false);
  });

  it("requires a landmark or street so officers can find the spot", () => {
    const result = NewReportSchema.safeParse({
      ...VALID_INPUT,
      location: { lat: 12.97, lng: 77.59, address: "  " },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = NewReportSchema.safeParse({ ...VALID_INPUT, category: "noise" });

    expect(result.success).toBe(false);
  });

  it("accepts a JPEG photo sent as a data URL", () => {
    const result = NewReportSchema.safeParse({
      ...VALID_INPUT,
      imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a file that is not a supported image type", () => {
    const result = NewReportSchema.safeParse({
      ...VALID_INPUT,
      imageUrl: "data:text/html;base64,PHNjcmlwdD4=",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a photo that is too large even after resizing", () => {
    const oversized = `data:image/jpeg;base64,${"A".repeat(3_000_000)}`;

    const result = NewReportSchema.safeParse({ ...VALID_INPUT, imageUrl: oversized });

    expect(result.success).toBe(false);
  });
});
