const UTC_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * A stored ISO timestamp as a readable date and time in UTC, for example "30 Oct 2026, 09:05".
 * The server and the browser format it the same way, so the rendered text never mismatches.
 * Callers say "UTC" next to it, in the text or a column heading.
 */
export function formatUtcDateTime(isoTimestamp: string): string {
  return UTC_DATE_TIME.format(new Date(isoTimestamp));
}
