import type { Report } from "./types";

/**
 * The outcome of changing a report. A change either produces the updated report, or it is
 * refused with a message an officer can read. Refused changes never reach storage.
 */
export type ChangeResult = { ok: true; report: Report } | { ok: false; error: string };
