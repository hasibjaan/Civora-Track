import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJsonReportRepository } from "@/data/repository";
import { buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";

describe("first use of an empty data folder", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cold-start-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("serves many simultaneous first requests without an error, and seeds the file once", async () => {
    const filePath = path.join(dir, "data", "reports.json");
    const store = createJsonReportRepository({ filePath, seed: () => buildSeedReports() });

    const results = await Promise.all(Array.from({ length: 12 }, () => store.list()));

    for (const reports of results) {
      expect(reports).toHaveLength(SEED_SPECS.length);
    }
    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveLength(SEED_SPECS.length);
  });
});
