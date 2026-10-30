import { describe, expect, it } from "vitest";

import {
  DUPLICATE_RADIUS_METERS,
  DUPLICATE_WINDOW_MS,
  findDuplicates,
  type DuplicateCandidate,
} from "@/domain/duplicates";
import { makeReport } from "../support/fixtures";

const NOW = new Date("2026-10-30T10:00:00.000Z");
const HOURS = 60 * 60 * 1000;

const BLOCKED_DRAIN: DuplicateCandidate = {
  description: "Drain outside 14 Lakeview Road is blocked with plastic waste.",
  category: "drainage",
  location: { lat: 12.97502, lng: 77.60102 },
  reportedAt: NOW,
};

const EXISTING_DRAIN = makeReport({
  id: "RPT-0000AAAA",
  description: "Blocked drain on Lakeview Road. Waste water overflows onto the footpath.",
  category: "drainage",
  location: { lat: 12.97504, lng: 77.60099 },
  reportedAt: new Date(NOW.getTime() - 20 * HOURS).toISOString(),
});

describe("findDuplicates", () => {
  it("links a report about the same problem nearby, in the same category, and close in time", () => {
    const matches = findDuplicates(BLOCKED_DRAIN, [EXISTING_DRAIN]);

    expect(matches.map((match) => match.reportId)).toEqual(["RPT-0000AAAA"]);
    expect(matches[0]?.distanceMeters).toBeLessThan(DUPLICATE_RADIUS_METERS);
  });

  it("ignores reports in a different category even when they are close and similar", () => {
    const other = { ...EXISTING_DRAIN, category: "waste" as const };

    expect(findDuplicates(BLOCKED_DRAIN, [other])).toEqual([]);
  });

  it("ignores reports beyond the distance radius", () => {
    const far = makeReport({
      ...EXISTING_DRAIN,
      id: "RPT-0000BBBB",
      location: { lat: 12.9775, lng: 77.6015 },
    });

    expect(findDuplicates(BLOCKED_DRAIN, [far])).toEqual([]);
  });

  it("ignores reports outside the time window", () => {
    const old = makeReport({
      ...EXISTING_DRAIN,
      id: "RPT-0000CCCC",
      reportedAt: new Date(NOW.getTime() - DUPLICATE_WINDOW_MS - HOURS).toISOString(),
    });

    expect(findDuplicates(BLOCKED_DRAIN, [old])).toEqual([]);
  });

  it("ignores reports that describe a different problem at the same spot", () => {
    const different = makeReport({
      ...EXISTING_DRAIN,
      id: "RPT-0000DDDD",
      description: "Street sweepers skipped this lane today and leaves are piling up.",
    });

    expect(findDuplicates(BLOCKED_DRAIN, [different])).toEqual([]);
  });

  it("never links to a resolved, rejected, or merged report", () => {
    const existing = [
      makeReport({ ...EXISTING_DRAIN, id: "RPT-0000E001", status: "resolved" }),
      makeReport({ ...EXISTING_DRAIN, id: "RPT-0000E002", status: "rejected" }),
      makeReport({ ...EXISTING_DRAIN, id: "RPT-0000E003", mergedInto: "RPT-0000AAAA" }),
    ];

    expect(findDuplicates(BLOCKED_DRAIN, existing)).toEqual([]);
  });

  it("sorts matches with the most similar wording first", () => {
    const weaker = makeReport({
      ...EXISTING_DRAIN,
      id: "RPT-0000F001",
      description: "Drain near Lakeview Road has stagnant water.",
    });

    const matches = findDuplicates(BLOCKED_DRAIN, [weaker, EXISTING_DRAIN]);

    expect(matches.map((match) => match.reportId)).toEqual(["RPT-0000AAAA", "RPT-0000F001"]);
    const similarities = matches.map((match) => match.similarity);
    expect(similarities).toEqual([...similarities].sort((a, b) => b - a));
  });
});
