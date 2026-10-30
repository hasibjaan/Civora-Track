import { distanceMeters, type Point } from "./geo";
import { isOpenReport } from "./open-reports";
import { contentWords, jaccardSimilarity } from "./text";
import type { Category, Report } from "./types";

/** Reports this close together can describe the same physical problem. */
export const DUPLICATE_RADIUS_METERS = 100;
/** Reports this far apart in time are probably separate incidents. */
export const DUPLICATE_WINDOW_MS = 72 * 60 * 60 * 1000;
/** Below this word overlap, two reports are about different things even if they are close. */
const MIN_TEXT_SIMILARITY = 0.2;

export interface DuplicateCandidate {
  description: string;
  category: Category;
  location: Point;
  reportedAt: Date;
}

export interface DuplicateMatch {
  reportId: string;
  similarity: number;
  distanceMeters: number;
}

/**
 * Finds open reports that probably describe the same problem as the candidate.
 * A match needs the same category, a nearby location, a close time, and similar wording.
 * Results are suggestions for an officer to confirm, not automatic merges.
 */
export function findDuplicates(
  candidate: DuplicateCandidate,
  existing: readonly Report[],
): DuplicateMatch[] {
  const candidateWords = contentWords(candidate.description);

  return existing
    .filter(
      (report) =>
        isOpenReport(report) &&
        report.category === candidate.category &&
        Math.abs(Date.parse(report.reportedAt) - candidate.reportedAt.getTime()) <=
          DUPLICATE_WINDOW_MS,
    )
    .flatMap((report) => {
      const distance = distanceMeters(candidate.location, report.location);
      if (distance > DUPLICATE_RADIUS_METERS) return [];

      const similarity = jaccardSimilarity(candidateWords, contentWords(report.description));
      if (similarity < MIN_TEXT_SIMILARITY) return [];

      return [
        {
          reportId: report.id,
          similarity: Math.round(similarity * 100) / 100,
          distanceMeters: Math.round(distance),
        },
      ];
    })
    .sort((a, b) => b.similarity - a.similarity);
}
