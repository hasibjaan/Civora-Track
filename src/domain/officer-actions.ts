import type { ChangeResult } from "./changes";
import { isOpenReport } from "./open-reports";
import { changeStatus } from "./status";
import type { Category, PriorityLevel, Report, Status, Team } from "./types";

/** Who is making a change, and when. Passed in so that every rule below is deterministic. */
export interface ActionContext {
  actor: string;
  at: Date;
}

/** Statuses in which a team can still be chosen or changed. Once work starts, it is fixed. */
const ASSIGNABLE_STATUSES = new Set<Status>(["submitted", "triaged", "assigned"]);

/** Whether the team can still be chosen or changed for this report. */
export function canChangeTeam(report: Report): boolean {
  return ASSIGNABLE_STATUSES.has(report.status);
}

function refuse(error: string): ChangeResult {
  return { ok: false, error };
}

function appendHistory(report: Report, entry: Report["history"][number]): Report {
  return { ...report, history: [...report.history, entry] };
}

/**
 * Assigns a team. A new report is triaged and then assigned in one step, so officers do
 * not need to click twice for the normal path. Reassigning before work starts is allowed.
 */
export function assignTeam(report: Report, team: Team, context: ActionContext): ChangeResult {
  if (!isOpenReport(report)) return refuse("This report is closed, so it cannot be changed.");
  if (!canChangeTeam(report)) {
    return refuse("Work has started on this report, so its team cannot be changed.");
  }
  if (report.assignedTeam === team) {
    return refuse(`This report is already with the ${team} team.`);
  }

  let current = report;
  if (current.status === "submitted") {
    const triaged = changeStatus(current, "triaged", context.actor, context.at);
    if (!triaged.ok) return triaged;
    current = triaged.report;
  }
  if (current.status === "triaged") {
    const assigned = changeStatus(current, "assigned", context.actor, context.at);
    if (!assigned.ok) return assigned;
    current = assigned.report;
  }

  return {
    ok: true,
    report: appendHistory(
      { ...current, assignedTeam: team },
      { type: "team_assigned", at: context.at.toISOString(), actor: context.actor, team },
    ),
  };
}

/**
 * Moves a report to another status. The workflow rules come from changeStatus(). These
 * checks add the rules that depend on the report's other fields.
 */
export function moveStatus(
  report: Report,
  to: Status,
  note: string | undefined,
  context: ActionContext,
): ChangeResult {
  if (!isOpenReport(report)) return refuse("This report is closed, so it cannot be changed.");
  if (to === "assigned") {
    return refuse("Use Assign to set a team, which also moves the report to Assigned.");
  }
  if (to === "in_progress" && !report.assignedTeam) {
    return refuse("Assign a team before starting work on this report.");
  }
  if (to === "rejected" && !note) {
    return refuse("Give a reason for rejecting this report.");
  }
  return changeStatus(report, to, context.actor, context.at, note);
}

export function overrideCategory(
  report: Report,
  category: Category,
  context: ActionContext,
): ChangeResult {
  if (!isOpenReport(report)) return refuse("This report is closed, so it cannot be changed.");
  if (report.category === category) return refuse("The report already has this category.");

  return {
    ok: true,
    report: appendHistory(
      { ...report, category },
      {
        type: "category_changed",
        at: context.at.toISOString(),
        actor: context.actor,
        from: report.category,
        to: category,
      },
    ),
  };
}

/** An officer's own priority. The calculated score is kept, so the change is never hidden. */
export function overridePriority(
  report: Report,
  level: PriorityLevel,
  reason: string,
  context: ActionContext,
): ChangeResult {
  if (!isOpenReport(report)) return refuse("This report is closed, so it cannot be changed.");

  return {
    ok: true,
    report: appendHistory(
      { ...report, priorityOverride: { level, reason } },
      {
        type: "priority_overridden",
        at: context.at.toISOString(),
        actor: context.actor,
        level,
        reason,
      },
    ),
  };
}

/**
 * Merges a duplicate into a primary report. The duplicate stays in storage for the record,
 * but drops out of the queue and counts toward the primary.
 */
export function mergeInto(
  duplicate: Report,
  primary: Report,
  context: ActionContext,
): ChangeResult {
  if (duplicate.id === primary.id) return refuse("A report cannot be merged into itself.");
  if (!isOpenReport(duplicate) || !isOpenReport(primary)) {
    return refuse("Only open reports can be merged.");
  }

  return {
    ok: true,
    report: {
      ...appendHistory(duplicate, {
        type: "merged_into",
        at: context.at.toISOString(),
        actor: context.actor,
        primaryId: primary.id,
      }),
      mergedInto: primary.id,
    },
  };
}
