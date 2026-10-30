import type { Report } from "@/domain/types";

/** A minimal valid report for tests. Override any field the test cares about. */
export function makeReport(overrides: Partial<Report> & Pick<Report, "id">): Report {
  const reportedAt = overrides.reportedAt ?? "2026-10-29T10:00:00.000Z";

  return {
    description: "Water stands on the road after every rain near the junction.",
    category: "waterlogging",
    location: { lat: 12.9716, lng: 77.5946 },
    status: "submitted",
    reportedAt,
    history: [{ type: "created", at: reportedAt, actor: "citizen" }],
    ...overrides,
  };
}
