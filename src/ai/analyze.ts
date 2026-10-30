import type { Point } from "@/domain/geo";
import { priorityContext } from "@/domain/priority-context";
import { scorePriority } from "@/domain/priority";
import type { Analysis, Category, Report } from "@/domain/types";

import {
  buildClassificationPrompt,
  CLASSIFICATION_SYSTEM_PROMPT,
  parseClassification,
} from "./classification";
import { classifyByKeywords, summarizeByRules } from "./rules";

/**
 * Sends a system prompt and user message to a language model and returns its text reply.
 * Returns null when the model is unavailable, so callers can fall back to rules.
 */
export type TextCompleter = (system: string, user: string) => Promise<string | null>;

/** What the analysis needs to know about a report. Only coordinates matter, not the address. */
export interface AnalysisInput {
  description: string;
  category: Category;
  location: Point;
  reportedAt: Date;
}

/** A category and summary produced by a language model. */
export interface AiClassification {
  category: Category;
  summary: string;
}

/**
 * Builds the analysis from the report, the existing reports, and an optional AI
 * classification. Synchronous and deterministic, so it can run when seed data is built.
 * The model never sets the priority. Only the scoring does.
 */
export function buildAnalysis(
  input: AnalysisInput,
  existing: readonly Report[],
  now: Date,
  ai: AiClassification | null,
): Analysis {
  const context = priorityContext(input, existing);
  const priority = scorePriority({
    description: input.description,
    category: input.category,
    reportedAt: input.reportedAt,
    now,
    duplicateCount: context.duplicates.length,
    nearbyOpenCount: context.nearbyOpenCount,
  });

  return {
    summary: ai?.summary ?? summarizeByRules(input.description),
    suggestedCategory: ai?.category ?? classifyByKeywords(input.description),
    priority,
    duplicateOf: context.duplicates.map((match) => match.reportId),
    method: ai ? "llm" : "rules",
    analyzedAt: now.toISOString(),
  };
}

/** Analyzes a new report, asking the language model for a category and summary first when one is available. */
export async function analyzeReport(
  input: AnalysisInput,
  existing: readonly Report[],
  now: Date,
  complete: TextCompleter | null,
): Promise<Analysis> {
  const ai = complete ? await classifyWithAi(input.description, complete) : null;
  return buildAnalysis(input, existing, now, ai);
}

async function classifyWithAi(
  description: string,
  complete: TextCompleter,
): Promise<AiClassification | null> {
  const reply = await complete(
    CLASSIFICATION_SYSTEM_PROMPT,
    buildClassificationPrompt(description),
  );
  return reply === null ? null : parseClassification(reply);
}
