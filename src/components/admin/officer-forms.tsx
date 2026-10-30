"use client";

import { useActionState, useId } from "react";

import { IDLE_ACTION_STATE, type ActionState } from "@/application/action-state";
import { CATEGORY_LABELS } from "@/domain/categories";
import { CATEGORY_IDS, PRIORITY_LEVELS, TEAM_IDS } from "@/domain/schemas";
import { PRIORITY_LABELS } from "@/domain/priority";
import { STATUS_LABELS } from "@/domain/status";
import { TEAM_LABELS } from "@/domain/teams";
import type { Category, PriorityLevel, Status, Team } from "@/domain/types";
import { inputClassName } from "@/components/report-form/form-field";

/** A server action that receives a form and returns what to show. */
export type OfficerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

interface Option {
  value: string;
  label: string;
}

interface FormProps {
  reportId: string;
  action: OfficerAction;
}

const SUBMIT_CLASS =
  "min-h-12 rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900";

const SELECT_LABEL_CLASS = "text-sm font-medium text-zinc-800 dark:text-zinc-200";

/** Announces the result of an action. Always rendered so screen readers catch the change. */
function ActionFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return <p role="status" className="sr-only" />;

  const isError = state.status === "error";
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${
        isError
          ? "border border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          : "border border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
      }`}
    >
      {isError ? `Not saved. ${state.message}` : state.message}
    </p>
  );
}

function Select({
  id,
  label,
  name,
  options,
  defaultValue,
}: {
  id: string;
  label: string;
  name: string;
  options: readonly Option[];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={SELECT_LABEL_CLASS}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className={inputClassName}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AssignForm({ reportId, action, defaultTeam }: FormProps & { defaultTeam: Team }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const selectId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        id={selectId}
        label="Team"
        name="team"
        defaultValue={defaultTeam}
        options={TEAM_IDS.map((team) => ({ value: team, label: TEAM_LABELS[team] }))}
      />
      <button type="submit" disabled={isPending} className={SUBMIT_CLASS} aria-busy={isPending}>
        {isPending ? "Saving..." : "Assign team"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function StatusForm({
  reportId,
  action,
  options,
}: FormProps & { options: readonly Status[] }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const selectId = useId();
  const noteId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        id={selectId}
        label="New status"
        name="to"
        defaultValue={options[0] ?? ""}
        options={options.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={noteId} className={SELECT_LABEL_CLASS}>
          Note (required when rejecting)
        </label>
        <textarea id={noteId} name="note" rows={2} maxLength={300} className={inputClassName} />
      </div>
      <button type="submit" disabled={isPending} className={SUBMIT_CLASS} aria-busy={isPending}>
        {isPending ? "Saving..." : "Update status"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function CategoryForm({ reportId, action, current }: FormProps & { current: Category }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const selectId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        id={selectId}
        label="Category"
        name="category"
        defaultValue={current}
        options={CATEGORY_IDS.map((category) => ({
          value: category,
          label: CATEGORY_LABELS[category],
        }))}
      />
      <button type="submit" disabled={isPending} className={SUBMIT_CLASS} aria-busy={isPending}>
        {isPending ? "Saving..." : "Change category"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function PriorityForm({
  reportId,
  action,
  current,
}: FormProps & { current: PriorityLevel }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const selectId = useId();
  const reasonId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        id={selectId}
        label="Priority"
        name="level"
        defaultValue={current}
        options={PRIORITY_LEVELS.map((level) => ({ value: level, label: PRIORITY_LABELS[level] }))}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={reasonId} className={SELECT_LABEL_CLASS}>
          Reason (required)
        </label>
        <textarea
          id={reasonId}
          name="reason"
          rows={2}
          required
          maxLength={300}
          className={inputClassName}
        />
      </div>
      <button type="submit" disabled={isPending} className={SUBMIT_CLASS} aria-busy={isPending}>
        {isPending ? "Saving..." : "Set priority"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function MergeForm({
  reportId,
  action,
  targets,
  suggestedId,
}: FormProps & { targets: readonly Option[]; suggestedId?: string }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const selectId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      <Select
        id={selectId}
        label="Keep this report instead"
        name="primaryId"
        defaultValue={suggestedId ?? targets[0]?.value ?? ""}
        options={targets}
      />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        This report leaves the queue and is counted on the report you choose. Its history is kept.
      </p>
      <button type="submit" disabled={isPending} className={SUBMIT_CLASS} aria-busy={isPending}>
        {isPending ? "Merging..." : "Merge into selected report"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
