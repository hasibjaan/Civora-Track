import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJsonReportRepository } from "@/data/repository";
import { buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";

import { describeReportRepository } from "./report-repository-contract";

describe("createJsonReportRepository", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "reports-test-"));
    filePath = path.join(dir, "nested", "reports.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function repository() {
    return createJsonReportRepository({ filePath, seed: buildSeedReports });
  }

  describeReportRepository(repository);

  it("writes the seed to the file on first read", async () => {
    await repository().list();

    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveLength(SEED_SPECS.length);
  });

  it("fails loudly when the stored file is corrupt", async () => {
    await repository().list();
    await writeFile(filePath, JSON.stringify([{ id: "broken" }]));

    await expect(repository().list()).rejects.toThrow();
  });
});
