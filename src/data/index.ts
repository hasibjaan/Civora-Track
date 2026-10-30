import "server-only";

import path from "node:path";

import { createFilePhotoStore, type PhotoStore } from "./photos";
import { createJsonReportRepository, type ReportRepository } from "./repository";
import { SEED_SPECS } from "./seed-data";
import { buildSeedReports } from "./seed";
import { storageConfig } from "./storage-config";
import { createServerSupabase } from "./supabase-client";
import { createSupabasePhotoStore } from "./supabase-photos";
import { createSupabaseReportRepository } from "./supabase-reports";

const config = storageConfig();

// Seeded at first use, so the demo data is recent whenever the store is reset.
const seed = () => buildSeedReports(SEED_SPECS, new Date());

function createStores(): { reportRepository: ReportRepository; photoStore: PhotoStore } {
  if (config.kind === "supabase") {
    const client = createServerSupabase(config);
    return {
      reportRepository: createSupabaseReportRepository({ client, seed }),
      photoStore: createSupabasePhotoStore(client),
    };
  }

  // Runtime data lives in data/, which is git-ignored.
  const directory = path.join(process.cwd(), "data");
  return {
    reportRepository: createJsonReportRepository({
      filePath: path.join(directory, "reports.json"),
      seed,
    }),
    photoStore: createFilePhotoStore(path.join(directory, "photos")),
  };
}

/** Where reports and photos are kept: "supabase", shared by every device, or local "files". */
export const storageKind = config.kind;

/** The app's report and photo stores. */
export const { reportRepository, photoStore } = createStores();
