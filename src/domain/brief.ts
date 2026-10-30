import { z } from "zod";

import { CATEGORY_LABELS } from "./categories";
import { mostUrgentLevel, PRIORITY_LABELS } from "./priority";
import type { Category, PriorityLevel } from "./types";

const BRIEF_URGENCY = ["immediate", "this_week", "routine"] as const;

/** The part of a brief that the model or the template writes. */
export const BriefContentSchema = z.object({
  headline: z.string().trim().min(1).max(140),
  issue: z.string().trim().min(1).max(400),
  evidence: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  suggestedAction: z.string().trim().min(1).max(400),
  urgency: z.enum(BRIEF_URGENCY),
});

export type BriefContent = z.infer<typeof BriefContentSchema>;

/** A brief as shown to officers, with how it was written so it can be labelled honestly. */
export interface Brief extends BriefContent {
  method: "llm" | "rules";
}

/** One report, reduced to the facts a brief may use. Nothing else reaches the model. */
export interface BriefReportFact {
  id: string;
  category: Category;
  summary: string;
  address: string | null;
  level: PriorityLevel;
  score: number;
  ageDays: number;
  /** The reasons behind the score, in plain language. */
  reasons: string[];
  /** True when the report describes an immediate danger. */
  dangerous: boolean;
}

export interface BriefFacts {
  subject: "report" | "hotspot";
  reports: BriefReportFact[];
  /** Hotspots only: mixed kinds of problem, or one kind keeps recurring. */
  kind?: "mixed" | "recurring";
  /** Hotspots only: distance from the centre to the furthest report. */
  spreadMeters?: number;
}

/** What to do about each kind of problem. Used when no model is available. */
const ACTION_BY_CATEGORY: Record<Category, string> = {
  waterlogging: "Clear the nearby drains and check the ground levels before the next rain.",
  drainage: "Clear the blockage and check the drain for further damage.",
  road_damage: "Make the surface safe with a temporary repair, then schedule a permanent fix.",
  streetlight: "Inspect the pole and wiring, then restore the light.",
  waste: "Collect the waste and review the collection schedule for this street.",
  other: "Visit the site and assign the right team.",
};

const SAFETY_PREFIX = "Make the site safe today. ";

/**
 * Writes a brief from the facts alone, with no model. Every statement comes from a fact,
 * so the output is deterministic and cannot invent details.
 */
export function templateBrief(facts: BriefFacts): BriefContent {
  return facts.subject === "hotspot" ? hotspotBrief(facts) : reportBrief(facts);
}

function hotspotBrief(facts: BriefFacts): BriefContent {
  const labels = unique(facts.reports.map((report) => CATEGORY_LABELS[report.category]));
  const count = facts.reports.length;
  const top = mostUrgentLevel(facts.reports.map((report) => report.level));
  const dangerous = facts.reports.filter((report) => report.dangerous);
  const categories = new Set(facts.reports.map((report) => report.category));
  const diameter = Math.round(((facts.spreadMeters ?? 0) * 2) / 10) * 10;

  const issue =
    facts.kind === "mixed"
      ? `Problems are spread over about ${diameter} m. Several kinds of problem appear together, so they may share a cause.`
      : `The same problem keeps being reported within about ${diameter} m, so the cause is probably not fixed.`;

  const action = hotspotAction(categories, facts.kind);

  return {
    headline: clip(`${count} open reports in one area: ${joinWords(labels)}`, 140),
    issue,
    evidence: clipAll(
      [
        `${count} open reports; the oldest has been open ${maxAge(facts.reports)}`,
        `Highest priority in the area: ${PRIORITY_LABELS[top]}`,
        ...(dangerous.length > 0
          ? [`Immediate danger reported at ${dangerous.map((report) => report.id).join(", ")}`]
          : []),
        ...landmarkEvidence(facts.reports),
      ],
      4,
    ),
    suggestedAction: (dangerous.length > 0 ? SAFETY_PREFIX : "") + action,
    urgency: urgencyFor(top),
  };
}

function reportBrief(facts: BriefFacts): BriefContent {
  const report = facts.reports[0];
  if (!report) throw new Error("A report brief needs one report.");

  const place = report.address ? ` at ${report.address}` : "";
  const evidence = [
    ...report.reasons.slice(0, 3),
    `Open for ${report.ageDays} ${report.ageDays === 1 ? "day" : "days"}`,
  ];

  return {
    headline: clip(`${CATEGORY_LABELS[report.category]}${place}`, 140),
    issue: report.summary,
    evidence: clipAll(evidence, 4),
    suggestedAction: (report.dangerous ? SAFETY_PREFIX : "") + ACTION_BY_CATEGORY[report.category],
    urgency: urgencyFor(report.level),
  };
}

function hotspotAction(categories: ReadonlySet<Category>, kind: BriefFacts["kind"]): string {
  if (categories.has("drainage") || categories.has("waterlogging")) {
    return "Inspect the drains first. A blocked drain is the likely cause of the waterlogging and road damage nearby.";
  }
  if (kind === "recurring") {
    return "Repair the underlying cause here, not only the reported spots.";
  }
  return "Send one crew to survey the area and combine the repairs into a single visit.";
}

/** Maps the most urgent level in a group to how soon the officer should act. */
export function urgencyFor(level: PriorityLevel): BriefContent["urgency"] {
  if (level === "urgent") return "immediate";
  if (level === "high") return "this_week";
  return "routine";
}

export const URGENCY_LABELS: Record<BriefContent["urgency"], string> = {
  immediate: "Act today",
  this_week: "Act this week",
  routine: "Routine",
};

function maxAge(reports: readonly BriefReportFact[]): string {
  const oldest = Math.max(...reports.map((report) => report.ageDays));
  return `${oldest} ${oldest === 1 ? "day" : "days"}`;
}

function landmarkEvidence(reports: readonly BriefReportFact[]): string[] {
  const places = unique(reports.flatMap((report) => (report.address ? [report.address] : [])));
  return places.length > 0 ? [`Landmarks: ${places.slice(0, 2).join("; ")}`] : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function clipAll(values: readonly string[], maxItems: number): string[] {
  return values.slice(0, maxItems).map((value) => clip(value, 200));
}
