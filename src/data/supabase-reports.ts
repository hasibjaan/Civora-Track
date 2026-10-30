import "server-only";

import { ReportSchema } from "@/domain/schemas";
import type { Report } from "@/domain/types";

import type { ReportRepository } from "./repository";
import { SupabaseRequestError, type ServerSupabase } from "./supabase-client";

export interface SupabaseRepositoryOptions {
  client: ServerSupabase;
  /** Fills the table when it is found empty: a new project, or one reset for a demo. */
  seed: () => Report[];
}

/** Supabase returns at most 1,000 rows per request by default, so lists are read in pages. */
const PAGE_SIZE = 1000;
/** The Postgres error code for a primary key that already exists. */
const UNIQUE_VIOLATION = "23505";
/** How many times a change is applied again when other saves to the same report keep winning. */
const MAX_ATTEMPTS = 5;

/**
 * A repository backed by a Supabase Postgres table, so every device sees the same reports.
 *
 * - Each report is one row: its ID, the report as JSON, and a version number that the database
 *   raises on every update.
 * - A change is applied to the stored copy and saved only if that copy's version is still
 *   current. If another save got there first, the change is applied again to the new copy. So
 *   two officers acting at the same moment cannot overwrite each other, and a refused change is
 *   never saved.
 * - Reports are validated against ReportSchema when written and when read.
 */
export function createSupabaseReportRepository({
  client,
  seed,
}: SupabaseRepositoryOptions): ReportRepository {
  const table = () => client.from("reports");

  async function readAll(): Promise<Report[]> {
    const reports: Report[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error, status } = await table()
        .select("report")
        // The order the reports arrived in, the same as the file store.
        .order("created_at")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new SupabaseRequestError("list reports", { code: error.code, status });

      reports.push(...data.map((row) => ReportSchema.parse(row.report)));
      if (data.length < PAGE_SIZE) return reports;
    }
  }

  // Seeding runs once per server, even when several requests find the table empty together.
  let seeding: Promise<Report[]> | undefined;

  async function seedTable(): Promise<Report[]> {
    const rows = seed().map((report) => ({ id: report.id, report: ReportSchema.parse(report) }));
    if (rows.length === 0) return [];

    // Another server may be seeding at the same moment. Whichever rows were written first stay.
    const { error, status } = await table().upsert(rows, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
    if (error) throw new SupabaseRequestError("add the demo reports", { code: error.code, status });
    return readAll();
  }

  return {
    async list() {
      const reports = await readAll();
      if (reports.length > 0) return reports;

      seeding ??= seedTable().finally(() => {
        seeding = undefined;
      });
      return seeding;
    },

    async get(id) {
      const { data, error, status } = await table().select("report").eq("id", id).maybeSingle();
      if (error) throw new SupabaseRequestError("read a report", { code: error.code, status });
      return data ? ReportSchema.parse(data.report) : undefined;
    },

    async create(report) {
      const stored = ReportSchema.parse(report);
      const { error, status } = await table().insert({ id: stored.id, report: stored });
      if (error?.code === UNIQUE_VIOLATION) {
        throw new Error(`A report with id ${stored.id} already exists.`);
      }
      if (error) throw new SupabaseRequestError("save a report", { code: error.code, status });
      return stored;
    },

    async modify(id, change) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const { data: row, error, status } = await table()
          .select("report, version")
          .eq("id", id)
          .maybeSingle();
        if (error) throw new SupabaseRequestError("read a report", { code: error.code, status });
        if (!row) return undefined;

        const result = change(ReportSchema.parse(row.report));
        if (!result.ok) return result;

        const report = ReportSchema.parse(result.report);
        const saved = await table()
          .update({ report })
          .eq("id", id)
          // Matches no row if another save has raised the version since the read above.
          .eq("version", row.version)
          .select("id");
        if (saved.error) {
          throw new SupabaseRequestError("save a change", {
            code: saved.error.code,
            status: saved.status,
          });
        }
        if (saved.data.length > 0) return { ok: true, report };
        // Another save won. Read the report again and apply the change to that version.
      }
      throw new Error(`Report ${id} kept changing while it was being saved. Try again.`);
    },
  };
}
