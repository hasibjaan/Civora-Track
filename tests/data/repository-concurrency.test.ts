import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJsonReportRepository } from "@/data/repository";
import { buildSeedReports } from "@/data/seed";
import { buildReport } from "@/domain/report";
import type { Report } from "@/domain/types";

const NOW = new Date("2026-10-30T10:00:00.000Z");

function newReport(id: string): Report {
  return buildReport(
    {
      description: "Concurrent write test report.",
      category: "waste",
      location: { lat: 12.97, lng: 77.59, address: "Test lane" },
    },
    { id, now: NOW },
  );
}

describe("createJsonReportRepository under concurrent use", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "repo-concurrency-"));
    filePath = path.join(dir, "reports.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps every report when many creates run at the same time", async () => {
    const store = createJsonReportRepository({ filePath, seed: buildSeedReports });
    const ids = Array.from({ length: 8 }, (_, index) => `RPT-00000${index}AA`);

    await Promise.all(ids.map((id) => store.create(newReport(id))));

    const stored = await store.list();
    for (const id of ids) {
      expect(stored.some((report) => report.id === id), id).toBe(true);
    }
  });

  it("picks up changes made to the file by another process", async () => {
    const store = createJsonReportRepository({ filePath, seed: buildSeedReports });
    const before = await store.list();

    // Simulate another process rewriting the file with a different number of reports.
    await writeFile(filePath, JSON.stringify([newReport("RPT-0000ABCD")]));

    const after = await store.list();
    expect(before.length).toBeGreaterThan(1);
    expect(after.map((report) => report.id)).toEqual(["RPT-0000ABCD"]);
  });
});
