"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/application/action-state";
import {
  assignReportTeam,
  changeReportCategory,
  changeReportPriority,
  changeReportStatus,
  mergeReportInto,
} from "@/application/officer-actions";
import { reportRepository } from "@/data";
import type { ChangeResult } from "@/domain/changes";
import {
  CATEGORY_IDS,
  PRIORITY_LEVELS,
  STATUS_IDS,
  TEAM_IDS,
  TRACKING_ID_PATTERN,
} from "@/domain/schemas";
import { signedInOfficer } from "@/lib/officer";

// A "use server" file may export only async functions. Shared types live in
// src/application/action-state.ts.

// Every action checks the sign-in itself, rather than relying only on the proxy's path rules.
const SIGNED_OUT: ActionState = { status: "error", message: "Sign in to make changes." };

// Every input is parsed here, on the server, whatever the form sent.
const ReportId = z.string().regex(TRACKING_ID_PATTERN, "That report does not exist.");
const OptionalNote = z.string().trim().max(300).optional();

const AssignInput = z.object({
  reportId: ReportId,
  team: z.enum(TEAM_IDS, { error: "Choose a team." }),
});
const StatusInput = z.object({
  reportId: ReportId,
  to: z.enum(STATUS_IDS, { error: "Choose a status." }),
  note: OptionalNote,
});
const CategoryInput = z.object({
  reportId: ReportId,
  category: z.enum(CATEGORY_IDS, { error: "Choose a problem category." }),
});
const PriorityInput = z.object({
  reportId: ReportId,
  level: z.enum(PRIORITY_LEVELS, { error: "Choose a priority level." }),
  reason: z.string().trim().min(1, "Give a reason for this change.").max(300),
});
const MergeInput = z.object({
  reportId: ReportId,
  primaryId: z.string().regex(TRACKING_ID_PATTERN, "Choose the report to merge into."),
});

/** Reads one text field from a form. Anything that is not text counts as missing. */
function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function invalid(error: z.ZodError): ActionState {
  return { status: "error", message: error.issues[0]?.message ?? "Check the form and try again." };
}

/** Turns a domain result into what the form shows, and refreshes the pages that display it. */
function finish(result: ChangeResult, savedMessage: string, reportIds: string[]): ActionState {
  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/admin");
  for (const id of reportIds) revalidatePath(`/admin/reports/${id}`);
  return { status: "saved", message: savedMessage };
}

export async function assignAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await signedInOfficer();
  if (!actor) return SIGNED_OUT;

  const input = AssignInput.safeParse({
    reportId: field(formData, "reportId"),
    team: field(formData, "team"),
  });
  if (!input.success) return invalid(input.error);

  const result = await assignReportTeam(reportRepository, input.data.reportId, input.data.team, {
    actor,
    at: new Date(),
  });
  return finish(result, "Team assigned.", [input.data.reportId]);
}

export async function changeStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await signedInOfficer();
  if (!actor) return SIGNED_OUT;

  const input = StatusInput.safeParse({
    reportId: field(formData, "reportId"),
    to: field(formData, "to"),
    note: field(formData, "note"),
  });
  if (!input.success) return invalid(input.error);

  const result = await changeReportStatus(
    reportRepository,
    input.data.reportId,
    input.data.to,
    input.data.note || undefined,
    { actor, at: new Date() },
  );
  return finish(result, "Status updated.", [input.data.reportId]);
}

export async function changeCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await signedInOfficer();
  if (!actor) return SIGNED_OUT;

  const input = CategoryInput.safeParse({
    reportId: field(formData, "reportId"),
    category: field(formData, "category"),
  });
  if (!input.success) return invalid(input.error);

  const result = await changeReportCategory(
    reportRepository,
    input.data.reportId,
    input.data.category,
    { actor, at: new Date() },
  );
  return finish(result, "Category updated.", [input.data.reportId]);
}

export async function changePriorityAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await signedInOfficer();
  if (!actor) return SIGNED_OUT;

  const input = PriorityInput.safeParse({
    reportId: field(formData, "reportId"),
    level: field(formData, "level"),
    reason: field(formData, "reason"),
  });
  if (!input.success) return invalid(input.error);

  const result = await changeReportPriority(
    reportRepository,
    input.data.reportId,
    input.data.level,
    input.data.reason,
    { actor, at: new Date() },
  );
  return finish(result, "Priority updated.", [input.data.reportId]);
}

export async function mergeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await signedInOfficer();
  if (!actor) return SIGNED_OUT;

  const input = MergeInput.safeParse({
    reportId: field(formData, "reportId"),
    primaryId: field(formData, "primaryId"),
  });
  if (!input.success) return invalid(input.error);

  const result = await mergeReportInto(
    reportRepository,
    input.data.reportId,
    input.data.primaryId,
    { actor, at: new Date() },
  );
  if (!result.ok) return { status: "error", message: result.error };

  // A merged report leaves its page's actions, so a message there would vanish at once.
  // Send the officer to the report it was merged into, which lists it as proof.
  revalidatePath("/admin");
  revalidatePath(`/admin/reports/${input.data.reportId}`);
  revalidatePath(`/admin/reports/${input.data.primaryId}`);
  redirect(`/admin/reports/${input.data.primaryId}`);
}
