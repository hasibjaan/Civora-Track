import { describe, expect, it } from "vitest";

import { describeHotspot, findHotspots, type Hotspot } from "@/domain/clustering";
import type { Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const BASE = { lat: 12.97, lng: 77.59 };
const METERS_PER_DEGREE_LATITUDE = 111_000;

/** A report placed `latOffsetMeters` north of the base point. */
function at(id: string, latOffsetMeters: number, overrides: Partial<Report> = {}): Report {
  return makeReport({
    id,
    location: { lat: BASE.lat + latOffsetMeters / METERS_PER_DEGREE_LATITUDE, lng: BASE.lng },
    ...overrides,
  });
}

function firstHotspot(reports: Report[]): Hotspot {
  const [hotspot] = findHotspots(reports);
  if (!hotspot) throw new Error("expected a hotspot");
  return hotspot;
}

describe("findHotspots", () => {
  it("finds a mixed hotspot when several kinds of problem sit close together", () => {
    const hotspot = firstHotspot([
      at("RPT-0000A001", 0, { category: "drainage" }),
      at("RPT-0000A002", 55, { category: "waste" }),
      at("RPT-0000A003", 110, { category: "road_damage" }),
    ]);

    expect(hotspot).toMatchObject({
      reportIds: ["RPT-0000A001", "RPT-0000A002", "RPT-0000A003"],
      categories: ["drainage", "road_damage", "waste"],
      kind: "mixed",
    });
  });

  it("marks a hotspot of one repeated kind of problem as recurring", () => {
    const hotspot = firstHotspot([
      at("RPT-0000B001", 0, { category: "road_damage" }),
      at("RPT-0000B002", 40, { category: "road_damage" }),
      at("RPT-0000B003", 80, { category: "road_damage" }),
    ]);

    expect(hotspot.kind).toBe("recurring");
  });

  it("needs at least three open reports, so a pair is not a hotspot", () => {
    const reports = [at("RPT-0000C001", 0), at("RPT-0000C002", 30)];

    expect(findHotspots(reports)).toEqual([]);
  });

  it("links a chain of reports, so a street with problems along it is one area", () => {
    // Each report is 122 m from the next. The ends are 244 m apart, which is beyond the
    // 150 m radius, but they are still in one area through the middle report.
    const hotspots = findHotspots([
      at("RPT-0000D001", 0),
      at("RPT-0000D002", 122),
      at("RPT-0000D003", 244),
    ]);

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0]?.reportIds).toHaveLength(3);
  });

  it("keeps separate areas apart", () => {
    const north = [0, 40, 80].map((offset, index) => at(`RPT-0000E00${index}`, offset));
    const south = [5000, 5040, 5080].map((offset, index) => at(`RPT-0000F00${index}`, offset));

    expect(findHotspots([...north, ...south])).toHaveLength(2);
  });

  it("ignores resolved, rejected and merged reports", () => {
    const reports = [
      at("RPT-0000G001", 0),
      at("RPT-0000G002", 40, { status: "resolved" }),
      at("RPT-0000G003", 80, { status: "rejected" }),
      at("RPT-0000G004", 120, { mergedInto: "RPT-0000G001" }),
    ];

    expect(findHotspots(reports)).toEqual([]);
  });

  it("gives the same hotspot ID however the reports are ordered", () => {
    const reports = [at("RPT-0000H001", 0), at("RPT-0000H002", 40), at("RPT-0000H003", 80)];

    expect(firstHotspot([...reports].reverse()).id).toBe("hotspot-RPT-0000H001");
    expect(firstHotspot(reports).id).toBe("hotspot-RPT-0000H001");
  });

  it("reports how far the area stretches from its centre", () => {
    const hotspot = firstHotspot([
      at("RPT-0000I001", 0),
      at("RPT-0000I002", 60),
      at("RPT-0000I003", 120),
    ]);

    expect(hotspot.spreadMeters).toBeGreaterThan(55);
    expect(hotspot.spreadMeters).toBeLessThan(90);
  });
});

describe("describeHotspot", () => {
  it("explains a mixed hotspot in plain language", () => {
    const hotspot = firstHotspot([
      at("RPT-0000J001", 0, { category: "drainage" }),
      at("RPT-0000J002", 55, { category: "waterlogging" }),
      at("RPT-0000J003", 110, { category: "waste" }),
    ]);

    const text = describeHotspot(hotspot);

    expect(text).toMatch(/^3 open reports spread over about \d+ m\./);
    expect(text).toContain("Waterlogging");
    expect(text).toContain("may share a cause");
  });

  it("explains a recurring hotspot by naming the one problem", () => {
    const hotspot = firstHotspot([
      at("RPT-0000K001", 0, { category: "road_damage" }),
      at("RPT-0000K002", 40, { category: "road_damage" }),
      at("RPT-0000K003", 80, { category: "road_damage" }),
    ]);

    expect(describeHotspot(hotspot)).toContain("keeps being reported here: Road damage.");
  });
});
