import "server-only";

import path from "node:path";

import { createPhotoStore } from "./photos";
import { createJsonReportRepository } from "./repository";
import { SEED_SPECS } from "./seed-data";
import { buildSeedReports } from "./seed";

const DATA_DIRECTORY = path.join(process.cwd(), "data");

/** The app's report store. Runtime data lives in data/ and is git-ignored. */
export const reportRepository = createJsonReportRepository({
  filePath: path.join(DATA_DIRECTORY, "reports.json"),
  // Seeded at first use, so the demo data is recent whenever data/ is reset.
  seed: () => buildSeedReports(SEED_SPECS, new Date()),
});

export const photoStore = createPhotoStore(path.join(DATA_DIRECTORY, "photos"));
