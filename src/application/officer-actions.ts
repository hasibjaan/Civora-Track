import type { ChangeResult } from "@/domain/changes";
import {
  assignTeam,
  mergeInto,
  moveStatus,
  overrideCategory,
  overridePriority,
  type ActionContext,
} from "@/domain/officer-actions";
import type { Category, PriorityLevel, Report, Status, Team } from "@/domain/types";

/** The part of the report store that officer actions need. */
export interface OfficerStore {
  get(id: string): Promise<Report | undefined>;
  modify(id: string, change: (current: Report) => ChangeResult): Promise<ChangeResult | undefined>;
}

const NOT_FOUND: ChangeResult = { ok: false, error: "This report could not be found." };

/**
 * Each use case loads the report, applies one domain rule, and saves the result only if the
 * rule allows it. The store applies the change to the current copy, so a refused change is
 * never written.
 */
async function applyToReport(
  store: OfficerStore,
  id: string,
  change: (report: Report) => ChangeResult,
): Promise<ChangeResult> {
  return (await store.modify(id, change)) ?? NOT_FOUND;
}

export function assignReportTeam(
  store: OfficerStore,
  id: string,
  team: Team,
  context: ActionContext,
): Promise<ChangeResult> {
  return applyToReport(store, id, (report) => assignTeam(report, team, context));
}

export function changeReportStatus(
  store: OfficerStore,
  id: string,
  to: Status,
  note: string | undefined,
  context: ActionContext,
): Promise<ChangeResult> {
  return applyToReport(store, id, (report) => moveStatus(report, to, note, context));
}

export function changeReportCategory(
  store: OfficerStore,
  id: string,
  category: Category,
  context: ActionContext,
): Promise<ChangeResult> {
  return applyToReport(store, id, (report) => overrideCategory(report, category, context));
}

export function changeReportPriority(
  store: OfficerStore,
  id: string,
  level: PriorityLevel,
  reason: string,
  context: ActionContext,
): Promise<ChangeResult> {
  return applyToReport(store, id, (report) => overridePriority(report, level, reason, context));
}

/**
 * Merges a duplicate into the primary report. The primary is read first so the merge can
 * check that it is still open. Both reports are checked again when the duplicate is saved.
 */
export async function mergeReportInto(
  store: OfficerStore,
  duplicateId: string,
  primaryId: string,
  context: ActionContext,
): Promise<ChangeResult> {
  const primary = await store.get(primaryId);
  if (!primary) return { ok: false, error: "The report to merge into could not be found." };

  return applyToReport(store, duplicateId, (duplicate) => mergeInto(duplicate, primary, context));
}
