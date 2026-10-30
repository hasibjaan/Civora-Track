import type { Photo, Report, ReportDetails } from "./types";

/** Human-readable tracking ID shown to citizens, for example RPT-3F9A1C2B5D7E. */
export function createReportId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `RPT-${hex.toUpperCase()}`;
}

/** Builds a new submitted report. Pure: the caller supplies the ID, the time, and any photo. */
export function buildReport(
  details: ReportDetails,
  { id, now, photo }: { id: string; now: Date; photo?: Photo },
): Report {
  const timestamp = now.toISOString();

  return {
    id,
    description: details.description,
    category: details.category,
    location: details.location,
    status: "submitted",
    reportedAt: timestamp,
    photo,
    history: [{ type: "created", at: timestamp, actor: "citizen" }],
  };
}
