import { beforeEach, describe, expect, it } from "vitest";

import { buildSeedReports } from "@/data/seed";
import { SEED_SPECS } from "@/data/seed-data";
import { SupabaseRequestError } from "@/data/supabase-client";
import { createSupabaseReportRepository } from "@/data/supabase-reports";
import { overrideCategory, overridePriority } from "@/domain/officer-actions";
import { ReportSchema } from "@/domain/schemas";

import { createFakeSupabase, type FakeSupabase } from "../support/fake-supabase";
import { describeReportRepository, newReport } from "./report-repository-contract";

const OFFICER = { actor: "officer", at: new Date("2026-10-30T10:00:00.000Z") };

describe("createSupabaseReportRepository", () => {
  let fake: FakeSupabase;

  beforeEach(() => {
    fake = createFakeSupabase();
  });

  function repository() {
    return createSupabaseReportRepository({ client: fake.client, seed: buildSeedReports });
  }

  describeReportRepository(repository);

  it("stores each report as one row, keyed by its tracking ID", async () => {
    await repository().list();

    expect(fake.rows.size).toBe(SEED_SPECS.length);
    expect(fake.rows.get("RPT-1001")?.report).toMatchObject({ id: "RPT-1001" });
  });

  it("seeds once, even when several requests find the table empty together", async () => {
    const store = repository();

    const results = await Promise.all(Array.from({ length: 5 }, () => store.list()));

    for (const reports of results) expect(reports).toHaveLength(SEED_SPECS.length);
    expect(fake.requests.filter((request) => request.startsWith("POST"))).toHaveLength(1);
  });

  it("reads every report when there are more than fit in one page", async () => {
    for (let index = 0; index < 2500; index += 1) {
      const id = `RPT-${index.toString(16).toUpperCase().padStart(6, "0")}`;
      fake.insertRow(id, newReport(id));
    }

    const reports = await repository().list();

    expect(reports).toHaveLength(2500);
    expect(new Set(reports.map((report) => report.id)).size).toBe(2500);
    expect(fake.requests.filter((request) => request.startsWith("GET"))).toHaveLength(3);
  });

  it("applies a change again when another device saved the same report first", async () => {
    const store = repository();
    await store.list();
    let otherDeviceSaved = false;
    fake.beforeUpdate = (id) => {
      const row = fake.rows.get(id);
      if (otherDeviceSaved || !row) return;
      otherDeviceSaved = true;
      // Another officer sets the priority between this officer's read and save.
      const report = ReportSchema.parse(row.report);
      const changed = overridePriority(report, "urgent", "School nearby.", OFFICER);
      if (changed.ok) Object.assign(row, { report: changed.report, version: row.version + 1 });
    };

    const result = await store.modify("RPT-1003", (current) =>
      overrideCategory(current, "road_damage", OFFICER),
    );

    expect(result?.ok).toBe(true);
    const saved = await store.get("RPT-1003");
    expect(saved?.category).toBe("road_damage");
    expect(saved?.priorityOverride?.level).toBe("urgent");
    expect(fake.requests.filter((request) => request.startsWith("PATCH"))).toHaveLength(2);
  });

  it("gives up with an error, saving nothing, when other saves keep winning", async () => {
    const store = repository();
    await store.list();
    const before = fake.rows.get("RPT-1003")?.report;
    fake.beforeUpdate = (id) => {
      const row = fake.rows.get(id);
      if (row) row.version += 1;
    };

    await expect(
      store.modify("RPT-1003", (current) => overrideCategory(current, "road_damage", OFFICER)),
    ).rejects.toThrow("kept changing");
    expect(fake.rows.get("RPT-1003")?.report).toEqual(before);
  });

  it("fails loudly when a stored report breaks the schema", async () => {
    fake.insertRow("RPT-1001", { id: "RPT-1001" });

    await expect(repository().list()).rejects.toThrow();
  });

  it("never repeats the database's error details, which can contain report text", async () => {
    const store = repository();
    await store.list();
    fake.intercept = (method) =>
      method === "POST"
        ? Response.json(
            { code: "23514", message: "check failed", details: "Failing row contains (secret)." },
            { status: 400 },
          )
        : undefined;

    const error = await store.create(newReport("RPT-ABCD0003")).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SupabaseRequestError);
    expect(String(error)).toContain("23514");
    expect(String(error)).not.toContain("secret");
  });

  it("says how to fix a project whose table has not been created", async () => {
    fake.intercept = () =>
      Response.json(
        { code: "PGRST205", message: "Could not find the table 'public.reports'" },
        { status: 404 },
      );

    await expect(repository().list()).rejects.toThrow("Run the SQL in supabase/migrations");
  });

  it("says when Supabase refuses the key", async () => {
    fake.intercept = () => Response.json({ message: "Invalid API key" }, { status: 401 });

    await expect(repository().get("RPT-1001")).rejects.toThrow("refused SUPABASE_SECRET_KEY");
  });
});
