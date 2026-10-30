import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildReport } from "@/domain/report";
import { changeStatus } from "@/domain/status";
import type { Report } from "@/domain/types";
import { createJsonReportRepository } from "@/data/repository";
import { buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";

const NOW = new Date("2026-10-30T10:00:00.000Z");

function newReport(id: string): Report {
  return buildReport(
    {
      description: "A new test report for the repository.",
      category: "waste",
      location: { lat: 12.97, lng: 77.59, address: "Test junction" },
    },
    { id, now: NOW },
  );
}

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

  it("creates the file from the seed on first read", async () => {
    const reports = await repository().list();

    expect(reports).toHaveLength(SEED_SPECS.length);
    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveLength(SEED_SPECS.length);
  });

  it("gets a report by ID and returns undefined for an unknown ID", async () => {
    const store = repository();

    expect((await store.get("RPT-1001"))?.category).toBe("drainage");
    expect(await store.get("RPT-9999")).toBeUndefined();
  });

  it("persists a created report across repository instances", async () => {
    await repository().create(newReport("RPT-ABCD0001"));

    const found = await repository().get("RPT-ABCD0001");
    expect(found?.description).toBe("A new test report for the repository.");
  });

  it("rejects creating a report with an ID that already exists", async () => {
    await expect(repository().create(newReport("RPT-1001"))).rejects.toThrow(
      "already exists",
    );
  });

  it("applies a change to a stored report and keeps the other reports unchanged", async () => {
    const store = repository();

    const result = await store.modify("RPT-1002", (current) =>
      changeStatus(current, "in_progress", "officer", NOW),
    );

    expect(result?.ok).toBe(true);
    expect((await store.get("RPT-1002"))?.status).toBe("in_progress");
    expect(await store.list()).toHaveLength(SEED_SPECS.length);
  });

  it("does not save a refused change", async () => {
    const store = repository();
    const before = await store.get("RPT-1002");

    const result = await store.modify("RPT-1002", (current) =>
      changeStatus(current, "resolved", "officer", NOW),
    );

    expect(result?.ok).toBe(false);
    expect(await store.get("RPT-1002")).toEqual(before);
  });

  it("reports a missing report as undefined rather than writing anything", async () => {
    expect(
      await repository().modify("RPT-DEAD0001", (current) =>
        changeStatus(current, "triaged", "officer", NOW),
      ),
    ).toBeUndefined();
  });

  it("fails loudly when the stored file is corrupt", async () => {
    await repository().list();
    await writeFile(filePath, JSON.stringify([{ id: "broken" }]));

    await expect(repository().list()).rejects.toThrow();
  });
});
