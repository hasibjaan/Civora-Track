import { buildReport } from "@/domain/report";
import type { Analysis, NewReport, Photo, Report } from "@/domain/types";

import type { AnalysisInput } from "@/ai/analyze";

/** Everything a submission needs from the outside world. Injected so the flow can be tested. */
export interface SubmitDeps {
  reports: {
    list(): Promise<readonly Report[]>;
    create(report: Report): Promise<Report>;
  };
  photos: {
    save(reportId: string, dataUrl: string): Promise<Photo>;
    remove(reportId: string): Promise<void>;
  };
  analyze(input: AnalysisInput, existing: readonly Report[], now: Date): Promise<Analysis>;
  createId(): string;
  now(): Date;
}

/**
 * Saves a citizen's report: stores the photo, analyzes the report against existing ones,
 * and persists the result. If anything fails after the photo is stored, the photo is removed
 * so that no orphan file is left behind.
 */
export async function submitReport(input: NewReport, deps: SubmitDeps): Promise<Report> {
  const { imageUrl, ...details } = input;
  const now = deps.now();
  const id = deps.createId();

  const photo = imageUrl === undefined ? undefined : await deps.photos.save(id, imageUrl);

  try {
    const existing = await deps.reports.list();
    const analysis = await deps.analyze({ ...details, reportedAt: now }, existing, now);
    const report: Report = { ...buildReport(details, { id, now, photo }), analysis };
    return await deps.reports.create(report);
  } catch (error) {
    if (photo) await deps.photos.remove(id);
    throw error;
  }
}
