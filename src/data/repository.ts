import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { ChangeResult } from "@/domain/changes";
import { ReportSchema } from "@/domain/schemas";
import type { Report } from "@/domain/types";

export interface ReportRepository {
  list(): Promise<readonly Report[]>;
  get(id: string): Promise<Report | undefined>;
  create(report: Report): Promise<Report>;
  /**
   * Applies a change to a stored report. Resolves to undefined if the report does not exist,
   * and to the change's result otherwise. A refused change is never written.
   */
  modify(
    id: string,
    change: (current: Report) => ChangeResult,
  ): Promise<ChangeResult | undefined>;
}

export interface JsonRepositoryOptions {
  filePath: string;
  /** Used to create the file the first time it is read. */
  seed: () => Report[];
}

interface Snapshot {
  mtimeMs: number;
  size: number;
  reports: readonly Report[];
}

const ReportListSchema = z.array(ReportSchema);

/**
 * A repository backed by one JSON file. Good enough for a single-server demo.
 *
 * - Writes run one at a time, so two requests cannot overwrite each other's changes.
 * - Each write goes to a temporary file and is then renamed, so a crash cannot leave a
 *   half-written file behind.
 * - Reads are served from memory and re-parsed only when the file's size or modified time
 *   changes. Checking the file's metadata is cheap, and it stays correct even if another
 *   process writes the file.
 */
export function createJsonReportRepository({
  filePath,
  seed,
}: JsonRepositoryOptions): ReportRepository {
  let snapshot: Snapshot | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  }

  // Seeding runs once, even when several requests arrive before the file exists.
  let seeding: Promise<readonly Report[]> | undefined;

  async function seedFile(): Promise<readonly Report[]> {
    try {
      const reports = seed();
      await writeAll(reports);
      return reports;
    } finally {
      seeding = undefined;
    }
  }

  async function writeAll(reports: readonly Report[]): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    // A unique name per write, so two writers can never clash on the same temporary file.
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(reports, null, 2));
    await rename(tempPath, filePath);

    const info = await stat(filePath);
    snapshot = { mtimeMs: info.mtimeMs, size: info.size, reports };
  }

  async function loadReports(): Promise<readonly Report[]> {
    let info;
    try {
      info = await stat(filePath);
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
      seeding ??= seedFile();
      return seeding;
    }

    if (snapshot && snapshot.mtimeMs === info.mtimeMs && snapshot.size === info.size) {
      return snapshot.reports;
    }

    // Fail loudly on a corrupt file rather than silently serving bad data.
    const reports = ReportListSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
    snapshot = { mtimeMs: info.mtimeMs, size: info.size, reports };
    return reports;
  }

  return {
    list: () => loadReports(),

    async get(id) {
      const reports = await loadReports();
      return reports.find((report) => report.id === id);
    },

    create: (report) =>
      serialize(async () => {
        const reports = await loadReports();
        if (reports.some((existing) => existing.id === report.id)) {
          throw new Error(`A report with id ${report.id} already exists.`);
        }
        await writeAll([...reports, report]);
        return report;
      }),

    modify: (id, change) =>
      serialize(async () => {
        // The change is computed from the report as it is now, inside the write queue, so two
        // officers acting at the same moment cannot overwrite each other's edits.
        const reports = await loadReports();
        const index = reports.findIndex((report) => report.id === id);
        if (index === -1) return undefined;

        const result = change(reports[index]);
        if (!result.ok) return result;

        await writeAll(
          reports.map((report, position) => (position === index ? result.report : report)),
        );
        return result;
      }),
  };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
