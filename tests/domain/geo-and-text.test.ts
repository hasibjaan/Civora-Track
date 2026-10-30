import { describe, expect, it } from "vitest";

import { distanceMeters } from "@/domain/geo";
import { contentWords, jaccardSimilarity } from "@/domain/text";

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters({ lat: 12.97, lng: 77.59 }, { lat: 12.97, lng: 77.59 })).toBe(0);
  });

  it("is about 111 km for one degree of latitude", () => {
    const meters = distanceMeters({ lat: 12, lng: 77 }, { lat: 13, lng: 77 });
    expect(meters).toBeGreaterThan(111_000);
    expect(meters).toBeLessThan(111_400);
  });

  it("is about 111 m for 0.001 degrees of latitude", () => {
    const meters = distanceMeters({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9726, lng: 77.5946 });
    expect(meters).toBeGreaterThan(105);
    expect(meters).toBeLessThan(115);
  });
});

describe("contentWords", () => {
  it("lower-cases words and drops stop words and very short words", () => {
    const words = contentWords("The drain is BLOCKED by waste, and it is on the road.");

    expect(words.has("drain")).toBe(true);
    expect(words.has("blocked")).toBe(true);
    expect(words.has("the")).toBe(false);
    expect(words.has("is")).toBe(false);
  });

  it("treats plural and singular forms as the same word", () => {
    expect(contentWords("drains")).toEqual(contentWords("drain"));
  });
});

describe("jaccardSimilarity", () => {
  it("is 1 for identical word sets and 0 for disjoint ones", () => {
    const a = new Set(["drain", "road"]);
    expect(jaccardSimilarity(a, new Set(["drain", "road"]))).toBe(1);
    expect(jaccardSimilarity(a, new Set(["streetlight"]))).toBe(0);
  });

  it("is 0 when either side is empty", () => {
    expect(jaccardSimilarity(new Set(), new Set(["drain"]))).toBe(0);
  });
});
