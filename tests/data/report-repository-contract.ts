import { describe, expect, it } from "vitest";

import type { ReportRepository } from "@/data/repository";
import { SEED_SPECS } from "@/data/seed-data";
import { overrideCategory, overridePriority } from "@/domain/officer-actions";
import { buildReport } from "@/domain/report";
import { changeStatus } from "@/domain/status";
import type { Report } from "@/domain/types";

const NOW = new Date("2026-10-30T10:00:00.000Z");
const OFFICER = { actor: "officer", at: NOW };

export function newReport(id: string): Report {
  return buildReport(
    {
      description: "A new test report for the repository.",
      category: "waste",
      location: { lat: 12.97, lng: 77.59, address: "Test junction" },
    },
    { id, now: NOW },
  );
}

/**
 * Behaviour every report store shares, so the file store and the Supabase store can be swapped
 * without the app noticing. `open` must return a store over empty storage, which fills itself
 * with the demo reports on first read. Run it inside a describe block that resets storage
 * before each test.
 */
export function describeReportRepository(open: () => ReportRepository): void {
  describe("behaviour shared by every report store", () => {
    it("fills empty storage with the demo reports on first read", async () => {
      const reports = await open().list();

      expect(reports).toHaveLength(SEED_SPECS.length);
      expect(reports[0]?.id).toBe("RPT-1001");
    });

    it("gets a report by ID, and returns undefined for an unknown ID", async () => {
      const store = open();
      await store.list();

      expect((await store.get("RPT-1001"))?.category).toBe("drainage");
      expect(await store.get("RPT-9999")).toBeUndefined();
    });

    it("keeps a created report, after the reports that were already there", async () => {
      const store = open();
      await store.list();

      await store.create(newReport("RPT-ABCD0001"));

      expect((await open().get("RPT-ABCD0001"))?.description).toBe(
        "A new test report for the repository.",
      );
      expect((await store.list()).at(-1)?.id).toBe("RPT-ABCD0001");
    });

    it("refuses a second report with an ID that already exists", async () => {
      const store = open();
      await store.list();

      await expect(store.create(newReport("RPT-1001"))).rejects.toThrow("already exists");
    });

    it("refuses to store a report that breaks the schema", async () => {
      const store = open();
      await store.list();

      await expect(
        store.create({ ...newReport("RPT-ABCD0002"), description: "" }),
      ).rejects.toThrow();
      expect(await store.get("RPT-ABCD0002")).toBeUndefined();
    });

    it("applies a change to the stored report and leaves the others unchanged", async () => {
      const store = open();
      const before = await store.list();

      const result = await store.modify("RPT-1002", (current) =>
        changeStatus(current, "in_progress", "officer", NOW),
      );

      expect(result?.ok).toBe(true);
      expect((await store.get("RPT-1002"))?.status).toBe("in_progress");
      const after = await store.list();
      expect(after.filter((report) => report.id !== "RPT-1002")).toEqual(
        before.filter((report) => report.id !== "RPT-1002"),
      );
    });

    it("does not save a refused change", async () => {
      const store = open();
      await store.list();
      const before = await store.get("RPT-1002");

      const result = await store.modify("RPT-1002", (current) =>
        changeStatus(current, "resolved", "officer", NOW),
      );

      expect(result?.ok).toBe(false);
      expect(await store.get("RPT-1002")).toEqual(before);
    });

    it("returns undefined, and writes nothing, for a report that does not exist", async () => {
      const store = open();
      await store.list();

      const result = await store.modify("RPT-DEAD0001", (current) =>
        changeStatus(current, "triaged", "officer", NOW),
      );

      expect(result).toBeUndefined();
      expect(await store.list()).toHaveLength(SEED_SPECS.length);
    });

    it("keeps both changes when two officers change one report at the same moment", async () => {
      const store = open();
      await store.list();

      await Promise.all([
        store.modify("RPT-1003", (current) => overrideCategory(current, "road_damage", OFFICER)),
        store.modify("RPT-1003", (current) =>
          overridePriority(current, "urgent", "School nearby.", OFFICER),
        ),
      ]);

      const saved = await store.get("RPT-1003");
      expect(saved?.category).toBe("road_damage");
      expect(saved?.priorityOverride?.level).toBe("urgent");
      expect(saved?.history.map((entry) => entry.type)).toEqual(
        expect.arrayContaining(["category_changed", "priority_overridden"]),
      );
    });

    it("keeps every report when many are created at the same moment", async () => {
      const store = open();
      await store.list();
      const ids = Array.from({ length: 8 }, (_, index) => `RPT-00000${index}AA`);

      await Promise.all(ids.map((id) => store.create(newReport(id))));

      const stored = await store.list();
      for (const id of ids) {
        expect(stored.some((report) => report.id === id), id).toBe(true);
      }
    });
  });
}
